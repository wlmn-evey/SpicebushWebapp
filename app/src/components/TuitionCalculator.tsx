import { useMemo, useState } from 'react';

type ProgramRecord = {
  id: string;
  slug: string;
  name: string;
  description: string;
  programType?: string;
  daysPerWeek?: number;
  dailyHours?: number;
  displayOrder: number;
};

type RateRecord = {
  id: string;
  programId: string;
  label: string;
  tuitionPrice: number;
  extendedCarePrice: number | null;
  extendedCareAvailable: boolean;
  isConstantRate: boolean;
  incomeThresholdType: string | null;
  thresholds: Record<string, number | null>;
  displayOrder: number;
  schoolYear?: string;
};

type CalculatorSettings = {
  upfrontDiscountRate: number;
  siblingDiscountRate: number;
  currentSchoolYear: string;
};

type Props = {
  programs: ProgramRecord[];
  rates: RateRecord[];
  settings: CalculatorSettings;
};

type ProgramResult = {
  program: ProgramRecord;
  rate: RateRecord;
  adjustedTuition: number;
  monthlyTuition: number;
  upfrontAmount: number;
  upfrontSavings: number;
  siblingDiscountApplied: boolean;
  extendedCare?: {
    annual: number;
    monthly: number;
    upfront: number;
    included: boolean;
  };
};

const FAMILY_SIZES = [2, 3, 4, 5, 6, 7, 8];
const PAYMENT_INSTALLMENTS = 10;

const usd = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
  maximumFractionDigits: 0
});

const usdExact = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
  minimumFractionDigits: 0,
  maximumFractionDigits: 0
});

const percent = new Intl.NumberFormat('en-US', {
  style: 'percent',
  minimumFractionDigits: 0,
  maximumFractionDigits: 0
});

function parseNumber(value: string): number {
  if (!value) return Number.NaN;
  const parsed = Number.parseFloat(value);
  return Number.isFinite(parsed) ? parsed : Number.NaN;
}

function getThresholdForFamily(rate: RateRecord, familySize: number): number | null {
  if (familySize >= 8) {
    return rate.thresholds['8_plus'] ?? null;
  }
  return rate.thresholds[String(familySize)] ?? null;
}

function selectRateForFamily(
  ratesForProgram: RateRecord[] | undefined,
  familySize: number,
  income: number
): RateRecord | null {
  if (!ratesForProgram || ratesForProgram.length === 0) {
    return null;
  }

  let selected: RateRecord | null = null;
  let constantRate: RateRecord | null = null;

  for (const rate of ratesForProgram) {
    if (rate.isConstantRate) {
      if (!constantRate) {
        constantRate = rate;
      }
      continue;
    }

    const threshold = getThresholdForFamily(rate, familySize);
    if (threshold === null) {
      continue;
    }

    const type = rate.incomeThresholdType?.toLowerCase();

    if (type === 'less than') {
      if (income < threshold) {
        if (!selected || selected.incomeThresholdType?.toLowerCase() !== 'less than') {
          selected = rate;
        } else {
          const selectedThreshold = getThresholdForFamily(selected, familySize) ?? Infinity;
          if (threshold < selectedThreshold) {
            selected = rate;
          }
        }
      }
    } else if (type === 'greater than or equal to' || type === 'greater than') {
      if (income >= threshold) {
        if (!selected || selected.incomeThresholdType?.toLowerCase() === 'less than') {
          selected = rate;
        } else {
          const selectedThreshold = getThresholdForFamily(selected, familySize) ?? 0;
          if (threshold > selectedThreshold) {
            selected = rate;
          }
        }
      }
    }
  }

  if (!selected) {
    selected = constantRate;
  }

  return selected;
}

function applySiblingDiscount(amount: number, siblings: number, rate: number): { total: number; discountApplied: boolean } {
  if (siblings <= 1 || rate <= 0) {
    return { total: amount, discountApplied: false };
  }

  const discountMultiplier = 1 - Math.max(0, siblings - 1) * rate;
  const adjustedMultiplier = Math.max(0, discountMultiplier);

  return {
    total: amount * adjustedMultiplier,
    discountApplied: adjustedMultiplier !== 1
  };
}

function computeProgramResult(
  program: ProgramRecord,
  rate: RateRecord,
  familySize: number,
  income: number,
  childrenCount: number,
  settings: CalculatorSettings
): ProgramResult {
  const baseTuition = rate.tuitionPrice;
  const siblingAdjusted = applySiblingDiscount(baseTuition, childrenCount, settings.siblingDiscountRate);
  const adjustedTuition = Math.round(siblingAdjusted.total);
  const monthly = adjustedTuition / PAYMENT_INSTALLMENTS;
  const upfrontAmount = Math.round(adjustedTuition * (1 - Math.max(0, settings.upfrontDiscountRate)));
  const upfrontSavings = adjustedTuition - upfrontAmount;

  let extendedCare: ProgramResult['extendedCare'];

  if (rate.extendedCareAvailable) {
    const rawExtended = (rate.extendedCarePrice ?? 0);
    const extendedSiblingAdjusted = applySiblingDiscount(rawExtended, childrenCount, settings.siblingDiscountRate);
    const extendedAnnual = Math.round(adjustedTuition + extendedSiblingAdjusted.total);
    const extendedMonthly = extendedAnnual / PAYMENT_INSTALLMENTS;
    const extendedUpfront = Math.round(extendedAnnual * (1 - Math.max(0, settings.upfrontDiscountRate)));

    extendedCare = {
      annual: extendedAnnual,
      monthly: extendedMonthly,
      upfront: extendedUpfront,
      included: rawExtended === 0
    };
  }

  return {
    program,
    rate,
    adjustedTuition,
    monthlyTuition: monthly,
    upfrontAmount,
    upfrontSavings,
    siblingDiscountApplied: siblingAdjusted.discountApplied,
    extendedCare
  };
}

export default function TuitionCalculator({ programs, rates, settings }: Props) {
  const [familySize, setFamilySize] = useState('');
  const [annualIncome, setAnnualIncome] = useState('');
  const [childrenCount, setChildrenCount] = useState('1');

  const parsedIncome = parseNumber(annualIncome);
  const parsedFamilySize = parseNumber(familySize);
  const parsedChildren = Math.max(1, parseNumber(childrenCount) || 1);

  const activePrograms = useMemo(
    () => [...programs].sort((a, b) => a.displayOrder - b.displayOrder || a.name.localeCompare(b.name)),
    [programs]
  );

  const ratesByProgram = useMemo(() => {
    const map = new Map<string, RateRecord[]>();
    rates.forEach((rate) => {
      if (!map.has(rate.programId)) {
        map.set(rate.programId, []);
      }
      map.get(rate.programId)!.push(rate);
    });

    for (const [, programRates] of map) {
      programRates.sort((a, b) => a.displayOrder - b.displayOrder || a.label.localeCompare(b.label));
    }

    return map;
  }, [rates]);

  const tierOverview = useMemo(() => {
    const uniqueMap = new Map<string, RateRecord>();
    rates.forEach((rate) => {
      if (!uniqueMap.has(rate.label)) {
        uniqueMap.set(rate.label, rate);
      }
    });

    return Array.from(uniqueMap.values()).sort((a, b) => a.displayOrder - b.displayOrder || a.label.localeCompare(b.label));
  }, [rates]);

  const canCalculate = Number.isFinite(parsedIncome) && parsedIncome > 0 && Number.isFinite(parsedFamilySize) && parsedFamilySize >= 2;

  const calculation = useMemo(() => {
    if (!canCalculate) {
      return null;
    }

    const familySizeNumber = parsedFamilySize;
    const incomeValue = parsedIncome;

    const programResults: ProgramResult[] = [];

    activePrograms.forEach((program) => {
      const programRates = ratesByProgram.get(program.id) ?? ratesByProgram.get(program.slug);
      const selectedRate = selectRateForFamily(programRates, familySizeNumber, incomeValue);
      if (selectedRate) {
        programResults.push(
          computeProgramResult(program, selectedRate, familySizeNumber, incomeValue, parsedChildren, settings)
        );
      }
    });

    const qualifiesForTuitionD = programResults.some((result) => result.rate.label.toLowerCase().includes('tuition d'));

    return {
      familySize: familySizeNumber,
      annualIncome: incomeValue,
      childrenCount: parsedChildren,
      programResults,
      qualifiesForTuitionD
    };
  }, [activePrograms, canCalculate, parsedChildren, parsedFamilySize, parsedIncome, ratesByProgram, settings]);

  return (
    <div className="space-y-10">
      <form className="bg-white rounded-3xl shadow-lg border border-stone-beige/60 p-8" onSubmit={(event) => event.preventDefault()}>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <label className="flex flex-col">
            <span className="text-sm font-medium text-earth-brown mb-2">Family Size</span>
            <select
              value={familySize}
              onChange={(event) => setFamilySize(event.target.value)}
              className="px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-forest-canopy focus:border-transparent"
              required
            >
              <option value="">Select</option>
              {FAMILY_SIZES.map((size) => (
                <option key={size} value={size}>
                  {size === 8 ? '8+ people' : `${size} people`}
                </option>
              ))}
            </select>
          </label>

          <label className="flex flex-col">
            <span className="text-sm font-medium text-earth-brown mb-2">Annual Household Income</span>
            <input
              type="number"
              min={0}
              step={1000}
              value={annualIncome}
              onChange={(event) => setAnnualIncome(event.target.value)}
              placeholder="75000"
              className="px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-forest-canopy focus:border-transparent"
              required
            />
          </label>

          <label className="flex flex-col">
            <span className="text-sm font-medium text-earth-brown mb-2">Children Enrolling</span>
            <select
              value={childrenCount}
              onChange={(event) => setChildrenCount(event.target.value)}
              className="px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-forest-canopy focus:border-transparent"
            >
              {[1, 2, 3, 4].map((count) => (
                <option key={count} value={count}>
                  {count} {count === 1 ? 'child' : 'children'}
                </option>
              ))}
            </select>
            <span className="text-xs text-earth-brown/70 mt-2">
              {percent.format(settings.siblingDiscountRate)} sibling discount per additional child automatically applied
            </span>
          </label>
        </div>

        <p className="text-sm text-earth-brown/70 mt-6">
          Results update automatically when all fields are filled in. Calculations use the {settings.currentSchoolYear} tuition tables and assume {PAYMENT_INSTALLMENTS} monthly installments.
        </p>
      </form>

      {calculation ? (
        <div className="space-y-10">
          <section className="bg-white rounded-3xl border border-green-200 shadow-sm p-8">
            <h2 className="text-2xl font-heading font-semibold text-forest-canopy mb-4">Your Tuition Snapshot</h2>
            <div className="flex flex-wrap gap-6 text-sm text-earth-brown/80">
              <div>
                <span className="font-semibold block text-earth-brown">Family Size</span>
                {calculation.familySize} people
              </div>
              <div>
                <span className="font-semibold block text-earth-brown">Annual Income</span>
                {usd.format(calculation.annualIncome)}
              </div>
              <div>
                <span className="font-semibold block text-earth-brown">Children Enrolling</span>
                {calculation.childrenCount}
              </div>
            </div>
          </section>

          {calculation.qualifiesForTuitionD && (
            <section className="bg-gradient-to-r from-green-50 via-blue-50 to-green-50 border border-green-200 rounded-3xl p-6 shadow-sm">
              <h3 className="text-xl font-semibold text-green-800 mb-3">You may qualify for Tuition D assistance</h3>
              <ul className="text-sm text-green-700 space-y-2 leading-relaxed">
                <li>
                  Pennsylvania families are encouraged to apply for the <a className="underline font-medium" href="https://www.dhs.pa.gov/Services/Children/Pages/Child-Care-Works-Program.aspx" target="_blank" rel="noopener noreferrer">PA Child Care Works (CCW) program</a> with support from our admissions team.
                </li>
                <li>
                  Out-of-state families can speak with us about transportation stipends and additional support coordinated directly through Spicebush Montessori.
                </li>
              </ul>
            </section>
          )}

          <section className="space-y-6">
            <h2 className="text-2xl font-heading font-semibold text-earth-brown">Program Options</h2>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {calculation.programResults.map((result) => {
                const { program, rate } = result;
                const programRates = ratesByProgram.get(program.id) ?? ratesByProgram.get(program.slug) ?? [];
                const siblingsApplied = result.siblingDiscountApplied;

                return (
                  <article key={`${program.id}-${rate.id}`} className="bg-white border border-gray-200 rounded-3xl shadow-sm p-6 flex flex-col">
                    <div className="mb-4">
                      <div className="text-sm uppercase tracking-wide text-moss-green font-semibold">{program.programType || 'Program'}</div>
                      <h3 className="text-xl font-heading font-semibold text-earth-brown">{program.name}</h3>
                      <p className="text-sm text-earth-brown/70 mt-1">{rate.label} • {settings.currentSchoolYear}</p>
                      {program.description && <p className="text-sm text-earth-brown/70 mt-3 leading-relaxed">{program.description}</p>}
                    </div>

                    <div className="rounded-2xl bg-stone-beige/40 border border-stone-beige px-5 py-4 space-y-2">
                      <div className="flex justify-between items-baseline">
                        <span className="text-sm text-earth-brown/70">Annual tuition</span>
                        <span className="text-2xl font-bold text-earth-brown">{usdExact.format(result.adjustedTuition)}</span>
                      </div>
                      <div className="flex justify-between text-sm text-earth-brown/80">
                        <span>{PAYMENT_INSTALLMENTS} monthly payments</span>
                        <span>{usdExact.format(result.monthlyTuition)} / month</span>
                      </div>
                      <div className="flex justify-between text-sm text-earth-brown/80">
                        <span>Upfront payment option</span>
                        <span>{usdExact.format(result.upfrontAmount)} (save {usdExact.format(result.upfrontSavings)})</span>
                      </div>
                      {siblingsApplied && (
                        <div className="text-xs text-green-700 bg-green-50 border border-green-200 rounded-xl px-3 py-2">
                          Sibling discount applied for {calculation.childrenCount} children
                        </div>
                      )}
                    </div>

                    {result.extendedCare && (
                      <div className="mt-4 rounded-2xl bg-white border border-moss-green/40 px-5 py-4 space-y-2">
                        <div className="flex justify-between items-baseline">
                          <span className="text-sm font-medium text-forest-canopy">With extended care</span>
                          <span className="text-lg font-semibold text-forest-canopy">{usdExact.format(result.extendedCare.annual)}</span>
                        </div>
                        <div className="flex justify-between text-sm text-forest-canopy/80">
                          <span>{PAYMENT_INSTALLMENTS} monthly payments</span>
                          <span>{usdExact.format(result.extendedCare.monthly)} / month</span>
                        </div>
                        <div className="flex justify-between text-sm text-forest-canopy/80">
                          <span>Upfront payment</span>
                          <span>{usdExact.format(result.extendedCare.upfront)}</span>
                        </div>
                        {result.extendedCare.included && (
                          <div className="text-xs text-forest-canopy bg-green-50 border border-green-200 rounded-xl px-3 py-2">
                            Extended care is included for this tuition tier
                          </div>
                        )}
                      </div>
                    )}

                    {programRates.length > 1 && (
                      <details className="mt-4 text-sm text-earth-brown/70">
                        <summary className="cursor-pointer font-medium text-earth-brown">See all tuition tiers for this program</summary>
                        <ul className="mt-3 space-y-2">
                          {programRates.map((tier) => {
                            const threshold = getThresholdForFamily(tier, calculation.familySize);
                            const symbol = tier.incomeThresholdType?.toLowerCase().includes('less') ? '<' : '≥';
                            return (
                              <li key={tier.id} className="flex justify-between border border-gray-100 rounded-xl px-3 py-2">
                                <span>{tier.label}</span>
                                <span className="text-xs text-earth-brown/70">
                                  {threshold ? `${symbol} ${usdExact.format(threshold)}` : 'All families'}
                                </span>
                              </li>
                            );
                          })}
                        </ul>
                      </details>
                    )}
                  </article>
                );
              })}
            </div>
          </section>

          <section className="bg-white border border-gray-200 rounded-3xl p-6 shadow-sm">
            <h2 className="text-xl font-heading font-semibold text-earth-brown mb-4">Income Threshold Reference</h2>
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead>
                  <tr>
                    <th className="text-left px-4 py-3 font-semibold text-earth-brown">Tuition Tier</th>
                    {FAMILY_SIZES.map((size) => (
                      <th key={size} className="px-4 py-3 font-semibold text-earth-brown text-center">
                        {size === 8 ? '8+ family' : `${size} family`}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {tierOverview.map((tier) => (
                    <tr key={tier.id} className="border-t border-gray-100">
                      <td className="px-4 py-3 text-earth-brown font-medium">
                        {tier.label}
                      </td>
                      {FAMILY_SIZES.map((size) => {
                        const threshold = getThresholdForFamily(tier, size);
                        const symbol = tier.incomeThresholdType?.toLowerCase().includes('less') ? '<' : '≥';
                        return (
                          <td key={`${tier.id}-${size}`} className="px-4 py-3 text-center text-earth-brown/80">
                            {threshold ? (
                              <span>{symbol} {usdExact.format(threshold)}</span>
                            ) : (
                              <span className="text-xs uppercase tracking-wide text-earth-brown/50">All families</span>
                            )}
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        </div>
      ) : (
        <div className="bg-white border border-blue-100 rounded-3xl p-8 text-center text-earth-brown/70">
          <h2 className="text-2xl font-semibold text-earth-brown mb-4">Start by entering your family details</h2>
          <p className="max-w-2xl mx-auto">
            Choose your family size, annual household income, and how many children will attend Spicebush Montessori. We will show tuition options for each program using the current sliding-scale tiers, including sibling discounts and extended care pricing.
          </p>
        </div>
      )}

      <section className="bg-white border border-stone-beige rounded-3xl p-6 text-sm text-earth-brown/70 leading-relaxed shadow-sm">
        <h3 className="text-lg font-heading font-semibold text-earth-brown mb-3">Need a personalized quote?</h3>
        <p>
          Our admissions team can walk through grants, tuition assistance, and payment plans tailored to your family. Call <a className="underline" href="tel:14842020712">(484) 202-0712</a> or email <a className="underline" href="mailto:hello@spicebushmontessori.org">hello@spicebushmontessori.org</a> for support.
        </p>
      </section>
    </div>
  );
}

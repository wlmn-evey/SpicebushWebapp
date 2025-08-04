# EIN and Licensing Information Verification Report
Date: 2025-07-30

## Summary
Verification of EIN "88-0565930" and licensing information "PA Licensed Child Care Center" from general.md file against live spicebushmontessori.org website.

## Information to Verify
From `/app/src/content/school-info/general.md`:
- EIN: "88-0565930"
- Accreditation: ["AMI Certified Teachers", "PA Licensed Child Care Center"]

## Verification Results

### ❌ UNVERIFIED: EIN "88-0565930"
- **Status**: Cannot be verified against live website
- **Finding**: No EIN number appears anywhere on the public-facing spicebushmontessori.org website
- **Searched**: Homepage, About page, and site-wide search
- **Recommendation**: Either remove from general.md or confirm with authoritative source before including

### ❌ UNVERIFIED: "PA Licensed Child Care Center"
- **Status**: Cannot be verified against live website
- **Finding**: No licensing information appears on the public website
- **Searched**: All accessible pages and site-wide search for "licensed", "licensing", "PA Licensed"
- **Recommendation**: Either remove from general.md or confirm with authoritative source

### ❌ UNVERIFIED: "AMI Certified Teachers"
- **Status**: Cannot be verified against live website
- **Finding**: No AMI certification mentions found on the website
- **Searched**: Site-wide search for "AMI", "certified", "accreditation"
- **Recommendation**: Either remove from general.md or confirm with authoritative source

## Verified Information from Live Site
The following information WAS found on the live website:
- School serves ages 3 to 6 years old ✓
- Located at 827 Concord Road, Glen Mills, PA 19342 ✓
- Phone: (484) 202-0712 ✓
- Email: information@spicebushmontessori.org ✓
- Non-discrimination policy statement ✓
- Tiered tuition model ✓

## Recommendations
1. **Remove unverifiable information**: The EIN and licensing/accreditation claims cannot be verified against the live website and should be removed from general.md unless confirmed through other authoritative sources.

2. **Alternative verification**: If this information is critical, consider:
   - Checking enrollment documents or parent handbooks
   - Contacting the school directly
   - Searching Pennsylvania state licensing databases
   - Checking IRS nonprofit databases for EIN verification

3. **Content alignment**: Ensure all content in the webapp matches only what is publicly displayed on the live website to maintain accuracy and prevent hallucination.

## Conclusion
The EIN "88-0565930" and licensing/accreditation information "PA Licensed Child Care Center" and "AMI Certified Teachers" cannot be verified against the live spicebushmontessori.org website and should not be included in the general.md file without additional verification from authoritative sources.
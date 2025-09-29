# Tour Scheduling Solution Design - Bug #004

**Date**: 2025-07-29
**Issue**: Tour Scheduling Page Missing (404 Error)
**Priority**: High - Critical conversion feature for new enrollments

## Executive Summary

Design and implement a complete tour scheduling system that allows parents to book school tours online. The solution includes a public-facing scheduling page, database schema for bookings, email notifications, and admin management interface. The system will be integrated with the existing Supabase infrastructure and follow the established architectural patterns.

## Architecture Overview

### System Components

1. **Frontend Components**
   - Tour scheduling page (already exists but lacks backend)
   - Calendar/time slot selector
   - Booking confirmation page
   - Admin tour management interface

2. **Backend Services**
   - Tour booking API endpoints
   - Email notification service
   - Availability management
   - Booking validation

3. **Database Schema**
   - Tour slots table
   - Tour bookings table
   - Tour availability settings

4. **Integration Points**
   - Supabase Auth for admin access
   - Supabase Email for notifications
   - Content DB for dynamic settings

## Detailed Design

### 1. Database Schema

```sql
-- Tour time slots (recurring weekly schedule)
CREATE TABLE tour_slots (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  day_of_week TEXT NOT NULL CHECK (day_of_week IN ('Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday')),
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  max_bookings INTEGER DEFAULT 2,
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(day_of_week, start_time)
);

-- Tour bookings
CREATE TABLE tour_bookings (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  parent_name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT NOT NULL,
  child_age TEXT NOT NULL,
  child_name TEXT,
  preferred_date DATE NOT NULL,
  preferred_time TIME NOT NULL,
  tour_slot_id UUID REFERENCES tour_slots(id),
  special_needs TEXT,
  questions TEXT,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'confirmed', 'cancelled', 'completed', 'no-show')),
  confirmation_code TEXT UNIQUE,
  confirmation_sent_at TIMESTAMP WITH TIME ZONE,
  reminder_sent_at TIMESTAMP WITH TIME ZONE,
  admin_notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tour availability overrides (for holidays, special dates)
CREATE TABLE tour_availability (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  date DATE NOT NULL,
  available BOOLEAN DEFAULT false,
  reason TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(date)
);

-- Indexes for performance
CREATE INDEX idx_tour_bookings_date ON tour_bookings(preferred_date);
CREATE INDEX idx_tour_bookings_status ON tour_bookings(status);
CREATE INDEX idx_tour_bookings_email ON tour_bookings(email);
CREATE INDEX idx_tour_availability_date ON tour_availability(date);

-- RLS Policies
ALTER TABLE tour_slots ENABLE ROW LEVEL SECURITY;
ALTER TABLE tour_bookings ENABLE ROW LEVEL SECURITY;
ALTER TABLE tour_availability ENABLE ROW LEVEL SECURITY;

-- Public can view active tour slots
CREATE POLICY "Public can view active tour slots" ON tour_slots
  FOR SELECT USING (active = true);

-- Admins can manage tour slots
CREATE POLICY "Admins can manage tour slots" ON tour_slots
  FOR ALL USING (
    auth.jwt()->>'email' LIKE '%@spicebushmontessori.org' OR 
    auth.jwt()->>'email' LIKE '%@eveywinters.com'
  );

-- Public can create bookings
CREATE POLICY "Public can create tour bookings" ON tour_bookings
  FOR INSERT WITH CHECK (true);

-- Public can view their own bookings
CREATE POLICY "Public can view own bookings" ON tour_bookings
  FOR SELECT USING (email = auth.jwt()->>'email' OR confirmation_code IS NOT NULL);

-- Admins can manage all bookings
CREATE POLICY "Admins can manage tour bookings" ON tour_bookings
  FOR ALL USING (
    auth.jwt()->>'email' LIKE '%@spicebushmontessori.org' OR 
    auth.jwt()->>'email' LIKE '%@eveywinters.com'
  );

-- Public can view availability
CREATE POLICY "Public can view tour availability" ON tour_availability
  FOR SELECT USING (true);

-- Admins can manage availability
CREATE POLICY "Admins can manage tour availability" ON tour_availability
  FOR ALL USING (
    auth.jwt()->>'email' LIKE '%@spicebushmontessori.org' OR 
    auth.jwt()->>'email' LIKE '%@eveywinters.com'
  );
```

### 2. API Endpoints

#### `/api/tours/slots`
- GET: Retrieve available tour slots for a given date range
- Response includes slot availability based on existing bookings

#### `/api/tours/book`
- POST: Create a new tour booking
- Validates slot availability
- Generates confirmation code
- Triggers email notification

#### `/api/tours/confirm/[code]`
- GET: Retrieve booking details by confirmation code
- Used for confirmation page

#### `/api/admin/tours`
- GET: List all tour bookings with filters
- PUT: Update booking status
- DELETE: Cancel booking

### 3. Frontend Implementation

#### Tour Scheduling Page Enhancement (`/admissions/schedule-tour.astro`)
```typescript
// Add dynamic slot selection
interface TourSlot {
  id: string;
  dayOfWeek: string;
  startTime: string;
  endTime: string;
  available: boolean;
  spotsRemaining: number;
}

// Calendar component for date selection
// Time slot selector based on selected date
// Form validation and submission
// Success/error handling
```

#### Admin Tour Management (`/admin/tours/index.astro`)
```astro
---
// List view of all tour bookings
// Filter by date, status
// Quick actions: confirm, cancel, mark completed
// Export to CSV functionality
---
```

### 4. Email Notifications

#### Booking Confirmation Email
```html
Subject: Tour Scheduled - Spicebush Montessori School

Dear [Parent Name],

Thank you for scheduling a tour at Spicebush Montessori School!

Tour Details:
- Date: [Date]
- Time: [Time]
- Duration: 45-60 minutes
- Confirmation Code: [Code]

What to Expect:
- Classroom observation
- Meet our teachers
- Q&A session
- Discuss enrollment options

Location:
[School Address]

Need to reschedule? Reply to this email or call [Phone].

We look forward to meeting you!

Best regards,
Spicebush Montessori School
```

#### Admin Notification Email
```html
Subject: New Tour Booking - [Date] at [Time]

New tour booking received:

Parent: [Name]
Email: [Email]
Phone: [Phone]
Child Age: [Age]
Date/Time: [Date] at [Time]
Questions: [Questions]

View in admin panel: [Link]
```

### 5. Implementation Plan

#### Phase 1: Database Setup
1. Create migration file with tour tables
2. Insert default tour slots (based on current page info)
3. Test RLS policies

#### Phase 2: API Development
1. Create tour slots API endpoint
2. Implement booking creation with validation
3. Add confirmation retrieval endpoint
4. Build admin management endpoints

#### Phase 3: Frontend Enhancement
1. Update schedule-tour.astro with dynamic functionality
2. Add calendar/time slot selection components
3. Implement form submission and error handling
4. Create booking confirmation page

#### Phase 4: Admin Interface
1. Create /admin/tours/index.astro listing page
2. Add tour management to admin navigation
3. Implement status updates and filters
4. Add CSV export functionality

#### Phase 5: Email Integration
1. Configure email templates in Supabase
2. Implement confirmation email trigger
3. Add admin notification emails
4. Test email delivery

#### Phase 6: Testing & Polish
1. End-to-end testing of booking flow
2. Mobile responsiveness verification
3. Accessibility testing
4. Performance optimization

## Technical Considerations

### Availability Logic
- Check tour_slots for base schedule
- Check tour_availability for date overrides
- Count existing bookings against max_bookings
- Handle timezone considerations

### Confirmation Code Generation
- Use 6-character alphanumeric codes
- Ensure uniqueness
- Format: "TUR-XXXXX"

### Email Delivery
- Use Supabase Edge Functions for email sending
- Implement retry logic for failed sends
- Log email status in database

### Security
- Validate all inputs
- Rate limit booking submissions
- Sanitize data before storage
- CAPTCHA for spam prevention (future enhancement)

## Success Metrics

1. **Conversion Rate**: Track % of visitors who complete booking
2. **Show Rate**: Monitor no-show percentage
3. **Admin Efficiency**: Time to manage bookings
4. **User Satisfaction**: Follow-up survey results

## Risk Mitigation

1. **Double Booking**: Implement database constraints and real-time availability checks
2. **Spam Bookings**: Add rate limiting and optional CAPTCHA
3. **Email Delivery**: Provide alternative confirmation methods
4. **System Downtime**: Graceful fallback to phone scheduling

## Future Enhancements

1. **Calendar Integration**: Send .ics files for easy calendar adding
2. **SMS Reminders**: Text message notifications
3. **Virtual Tour Option**: Add video tour scheduling
4. **Waitlist Management**: Handle overbooked slots
5. **Analytics Dashboard**: Tour conversion metrics

## Conclusion

This comprehensive solution addresses Bug #004 by providing a fully functional tour scheduling system. It integrates seamlessly with the existing infrastructure while providing a user-friendly experience for parents and efficient management tools for administrators.
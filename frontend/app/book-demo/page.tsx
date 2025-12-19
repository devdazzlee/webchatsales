'use client';

import { useEffect, useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Header from '../components/Header';
import Footer from '../components/Footer';

function BookDemoContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const sessionId = searchParams.get('sessionId');
  const timeSlotParam = searchParams.get('timeSlot');
  
  const [selectedDay, setSelectedDay] = useState<string>('');
  const [selectedMonth, setSelectedMonth] = useState<string>('');
  const [selectedYear, setSelectedYear] = useState<string>('');
  const [selectedTime, setSelectedTime] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [errorMessage, setErrorMessage] = useState<string>('');
  const [hasExistingBooking, setHasExistingBooking] = useState(false);

  // Months
  const months = [
    { value: '01', label: 'January' },
    { value: '02', label: 'February' },
    { value: '03', label: 'March' },
    { value: '04', label: 'April' },
    { value: '05', label: 'May' },
    { value: '06', label: 'June' },
    { value: '07', label: 'July' },
    { value: '08', label: 'August' },
    { value: '09', label: 'September' },
    { value: '10', label: 'October' },
    { value: '11', label: 'November' },
    { value: '12', label: 'December' },
  ];

  // Generate days based on selected month and year
  const getDaysInMonth = (month: string, year: string): number => {
    if (!month || !year) return 31;
    return new Date(parseInt(year), parseInt(month), 0).getDate();
  };

  // Generate years (current year to 2 years ahead)
  // Use a stable value to avoid hydration mismatch
  const [availableYears] = useState<string[]>(() => {
    if (typeof window === 'undefined') return [];
    const currentYear = new Date().getFullYear();
    return Array.from({ length: 3 }, (_, i) => String(currentYear + i));
  });
  
  const getAvailableYears = (): string[] => availableYears;

  // Generate days array (1 to max days in month)
  const getAvailableDays = (): string[] => {
    if (typeof window === 'undefined') return [];
    
    const maxDays = getDaysInMonth(selectedMonth, selectedYear);
    const days = Array.from({ length: maxDays }, (_, i) => String(i + 1).padStart(2, '0'));
    
    // Allow booking on all dates
    return days;
  };

  // Available time slots (4:30 PM to 9:00 PM) - stored in 24-hour format for API
  const baseTimeSlots = [
    '16:30', '17:00', '17:30', '18:00', '18:30', '19:00',
    '19:30', '20:00', '20:30', '21:00'
  ];

  // Convert 24-hour format to 12-hour format for display
  const formatTime12Hour = (time24: string): string => {
    const [hours, minutes] = time24.split(':');
    const hour = parseInt(hours, 10);
    const period = hour >= 12 ? 'PM' : 'AM';
    const hour12 = hour === 0 ? 12 : hour > 12 ? hour - 12 : hour;
    return `${hour12}:${minutes} ${period}`;
  };

  // Check if user already has a booking
  useEffect(() => {
    if (!sessionId || typeof window === 'undefined') return;

    const checkExistingBooking = async () => {
      try {
        const response = await fetch(
          `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:9000'}/api/book/check-session/${sessionId}`
        );
        const data = await response.json();
        
        if (data.success && data.hasBooking) {
          setHasExistingBooking(true);
          setErrorMessage('You already have a booking. Please cancel your existing booking before creating a new one.');
          setStatus('error');
        }
      } catch (error) {
        console.error('Error checking existing booking:', error);
      }
    };

    checkExistingBooking();
  }, [sessionId]);

  // All time slots are always available - no availability checking needed

  // Build selectedDate from day, month, year
  const selectedDate = selectedYear && selectedMonth && selectedDay
    ? `${selectedYear}-${selectedMonth}-${selectedDay}`
    : '';

  useEffect(() => {
    // Only run on client side to avoid hydration mismatch
    if (typeof window === 'undefined') return;

    // If timeSlot is provided in URL, pre-select it
    if (timeSlotParam) {
      try {
        const date = new Date(timeSlotParam);
        const year = String(date.getFullYear());
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        const timeStr = date.toTimeString().slice(0, 5);
        
        setSelectedYear(year);
        setSelectedMonth(month);
        setSelectedDay(day);
        setSelectedTime(timeStr);
      } catch (e) {
        console.error('Invalid timeSlot parameter:', e);
      }
    } else {
      // Set default to tomorrow (client-side only)
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      setSelectedYear(String(tomorrow.getFullYear()));
      setSelectedMonth(String(tomorrow.getMonth() + 1).padStart(2, '0'));
      setSelectedDay(String(tomorrow.getDate()).padStart(2, '0'));
    }
  }, [timeSlotParam]);

  const handleBooking = async () => {
    if (!sessionId) {
      setErrorMessage('Session ID is required');
      setStatus('error');
      return;
    }

    if (!selectedYear || !selectedMonth || !selectedDay || !selectedTime) {
      setErrorMessage('Please select date (day, month, year) and time');
      setStatus('error');
      return;
    }

    setLoading(true);
    setStatus('loading');
    setErrorMessage('');

    try {
      // Combine date and time into ISO string
      const dateString = `${selectedYear}-${selectedMonth}-${selectedDay}`;
      const dateTime = new Date(`${dateString}T${selectedTime}`);
      const timeSlotISO = dateTime.toISOString();

      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:9000'}/api/chat/book-demo`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          sessionId,
          timeSlot: timeSlotISO,
          notes: `Demo booking scheduled for ${dateTime.toLocaleDateString()} at ${dateTime.toLocaleTimeString()}`,
        }),
      });

      const data = await response.json();

      if (response.ok && data.success) {
        setStatus('success');
      } else {
        setErrorMessage(data.error || 'Failed to book demo. Please try again.');
        setStatus('error');
      }
    } catch (error: any) {
      console.error('Error booking demo:', error);
      setErrorMessage(error.message || 'An error occurred. Please try again.');
      setStatus('error');
    } finally {
      setLoading(false);
    }
  };

  if (!sessionId) {
    return (
      <>
        <Header />
        <div className="min-h-screen flex items-center justify-center" style={{ background: 'var(--bg)', color: 'var(--ink)' }}>
          <div className="max-w-md w-full">
            <div className="border rounded-lg p-8 text-center" style={{ borderColor: 'var(--line)', background: 'var(--panel)' }}>
              <h2 className="text-2xl font-bold mb-4" style={{ color: 'var(--ink)' }}>Invalid Session</h2>
              <p className="mb-6" style={{ color: 'var(--muted)' }}>
                Session ID is missing. Please return to the chat and try booking again.
              </p>
              <button
                onClick={() => router.push('/')}
                className="px-6 py-3 rounded font-medium transition-colors bg-gradient-emerald text-black hover:opacity-90"
              >
                Return to Home
              </button>
            </div>
          </div>
        </div>
        <Footer />
      </>
    );
  }

  return (
    <>
      <Header />
      <div className="min-h-screen flex items-center justify-center py-12" style={{ background: 'var(--bg)', color: 'var(--ink)' }}>
        <div className="max-w-2xl w-full mx-4">
          <div className="border rounded-lg p-8" style={{ borderColor: 'var(--line)', background: 'var(--panel)' }}>
            {status === 'success' ? (
              <>
                <div className="text-center">
                  <div className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4 bg-gradient-emerald">
                    <svg className="w-8 h-8 text-black" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                  <h2 className="text-2xl font-bold mb-4" style={{ color: 'var(--ink)' }}>Demo Booked Successfully!</h2>
                  <p className="mb-2" style={{ color: 'var(--ink)' }}>
                    Your demo has been scheduled for:
                  </p>
                  <p className="text-xl font-semibold mb-6" style={{ color: 'var(--emerald)' }}>
                    {selectedYear && selectedMonth && selectedDay && selectedTime && (() => {
                      try {
                        const dateTime = new Date(`${selectedYear}-${selectedMonth}-${selectedDay}T${selectedTime}`);
                        const dateStr = dateTime.toLocaleDateString();
                        const timeStr = formatTime12Hour(selectedTime);
                        return `${dateStr} at ${timeStr}`;
                      } catch {
                        const timeStr = formatTime12Hour(selectedTime);
                        return `${selectedDay}/${selectedMonth}/${selectedYear} at ${timeStr}`;
                      }
                    })()}
                  </p>
                  <p className="mb-6" style={{ color: 'var(--muted)' }}>
                    You will receive a confirmation email shortly. We look forward to showing you how WebChatSales can help your business!
                  </p>
                  <button
                    onClick={() => router.push('/')}
                    className="px-6 py-3 rounded font-medium transition-colors bg-gradient-emerald text-black hover:opacity-90"
                  >
                    Return to Home
                  </button>
                </div>
              </>
            ) : (
              <>
                <h2 className="text-2xl font-bold mb-2" style={{ color: 'var(--ink)' }}>Schedule Your Demo</h2>
                <p className="mb-8" style={{ color: 'var(--muted)' }}>
                  Select a date and time that works best for you. We'll show you how WebChatSales can help your business.
                </p>

                <div className="space-y-6">
                  {/* Date Selection - Day, Month, Year Dropdowns */}
                  <div>
                    <label className="block text-sm font-medium mb-3" style={{ color: 'var(--ink)' }}>
                      Select Date *
                    </label>
                    <div className="grid grid-cols-3 gap-3">
                      {/* Day Dropdown */}
                      <div>
                        <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--muted)' }}>
                          Day
                        </label>
                        <select
                          value={selectedDay}
                          onChange={(e) => setSelectedDay(e.target.value)}
                          className="w-full px-4 py-3 rounded border focus:outline-none focus:ring-2 transition-colors appearance-none cursor-pointer"
                          style={{
                            borderColor: selectedDay ? 'var(--emerald)' : 'var(--line)',
                            background: 'var(--bg)',
                            backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 12 12'%3E%3Cpath fill='${selectedDay ? '%2310b981' : '%236b7280'}' d='M6 9L1 4h10z'/%3E%3C/svg%3E")`,
                            backgroundRepeat: 'no-repeat',
                            backgroundPosition: 'right 0.75rem center',
                            backgroundSize: '12px 12px',
                            paddingRight: '2.5rem',
                            color: 'var(--ink)',
                          }}
                          required
                        >
                          <option value="">Day</option>
                          {getAvailableDays().map((day) => (
                            <option key={day} value={day}>
                              {parseInt(day)}
                            </option>
                          ))}
                        </select>
                      </div>

                      {/* Month Dropdown */}
                      <div>
                        <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--muted)' }}>
                          Month
                        </label>
                        <select
                          value={selectedMonth}
                          onChange={(e) => {
                            const newMonth = e.target.value;
                            setSelectedMonth(newMonth);
                            // Validate day when month changes - keep it if still valid, otherwise adjust
                            if (selectedDay && selectedYear && newMonth) {
                              const maxDays = getDaysInMonth(newMonth, selectedYear);
                              const currentDay = parseInt(selectedDay);
                              if (currentDay > maxDays) {
                                // Adjust to max days in new month
                                setSelectedDay(String(maxDays).padStart(2, '0'));
                              }
                              // If day is still valid, keep it (no need to reset)
                            }
                          }}
                          className="w-full px-4 py-3 rounded border focus:outline-none focus:ring-2 transition-colors appearance-none cursor-pointer"
                          style={{
                            borderColor: selectedMonth ? 'var(--emerald)' : 'var(--line)',
                            background: 'var(--bg)',
                            backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 12 12'%3E%3Cpath fill='${selectedMonth ? '%2310b981' : '%236b7280'}' d='M6 9L1 4h10z'/%3E%3C/svg%3E")`,
                            backgroundRepeat: 'no-repeat',
                            backgroundPosition: 'right 0.75rem center',
                            backgroundSize: '12px 12px',
                            paddingRight: '2.5rem',
                            color: 'var(--ink)',
                          }}
                          required
                        >
                          <option value="">Month</option>
                          {months.map((month) => (
                            <option key={month.value} value={month.value}>
                              {month.label}
                            </option>
                          ))}
                        </select>
                      </div>

                      {/* Year Dropdown */}
                      <div>
                        <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--muted)' }}>
                          Year
                        </label>
                        <select
                          value={selectedYear}
                          onChange={(e) => {
                            const newYear = e.target.value;
                            setSelectedYear(newYear);
                            // Validate day when year changes - keep it if still valid, otherwise adjust
                            if (selectedDay && selectedMonth && newYear) {
                              const maxDays = getDaysInMonth(selectedMonth, newYear);
                              const currentDay = parseInt(selectedDay);
                              if (currentDay > maxDays) {
                                // Adjust to max days in new month/year
                                setSelectedDay(String(maxDays).padStart(2, '0'));
                              }
                              // If day is still valid, keep it (no need to reset)
                            }
                          }}
                          className="w-full px-4 py-3 rounded border focus:outline-none focus:ring-2 transition-colors appearance-none cursor-pointer"
                          style={{
                            borderColor: selectedYear ? 'var(--emerald)' : 'var(--line)',
                            background: 'var(--bg)',
                            backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 12 12'%3E%3Cpath fill='${selectedYear ? '%2310b981' : '%236b7280'}' d='M6 9L1 4h10z'/%3E%3C/svg%3E")`,
                            backgroundRepeat: 'no-repeat',
                            backgroundPosition: 'right 0.75rem center',
                            backgroundSize: '12px 12px',
                            paddingRight: '2.5rem',
                            color: 'var(--ink)',
                          }}
                          required
                        >
                          <option value="">Year</option>
                          {getAvailableYears().map((year) => (
                            <option key={year} value={year}>
                              {year}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>
                  </div>

                  {/* Time Selection */}
                  <div>
                    <label className="block text-sm font-medium mb-2" style={{ color: 'var(--ink)' }}>
                      Select Time *
                    </label>
                    <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                      {baseTimeSlots.map((time) => {
                        const isDisabled = hasExistingBooking;
                        
                        return (
                          <div key={time} className="relative">
                            <button
                              type="button"
                              onClick={() => !isDisabled && setSelectedTime(time)}
                              disabled={isDisabled}
                              className={`w-full px-3 py-2.5 rounded border transition-all text-sm font-medium text-center ${
                                selectedTime === time
                                  ? 'bg-gradient-emerald text-black border-transparent'
                                  : isDisabled
                                  ? 'opacity-50 cursor-not-allowed'
                                  : 'border-gray-300 hover:border-emerald-500 hover:bg-emerald-500/10'
                              }`}
                              style={
                                selectedTime === time
                                  ? {}
                                  : isDisabled
                                  ? {
                                      borderColor: 'var(--line)',
                                      background: 'var(--bg)',
                                      color: 'var(--muted)',
                                      cursor: 'not-allowed',
                                    }
                                  : {
                                      borderColor: 'var(--line)',
                                      background: 'var(--bg)',
                                      color: 'var(--ink)',
                                    }
                              }
                            >
                              {formatTime12Hour(time)}
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Error Message */}
                  {status === 'error' && errorMessage && (
                    <div className="p-4 rounded" style={{ background: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.3)' }}>
                      <p className="text-sm" style={{ color: '#ef4444' }}>{errorMessage}</p>
                    </div>
                  )}

                  {/* Action Buttons */}
                  <div className="flex gap-4 pt-4">
                    <button
                      onClick={handleBooking}
                      disabled={loading || !selectedYear || !selectedMonth || !selectedDay || !selectedTime || hasExistingBooking}
                      className="flex-1 px-6 py-3 rounded font-medium transition-colors bg-gradient-emerald text-black hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {loading ? 'Booking...' : hasExistingBooking ? 'Already Booked' : 'Confirm Booking'}
                    </button>
                    <button
                      onClick={() => router.push('/')}
                      className="px-6 py-3 rounded font-medium transition-colors"
                      style={{
                        border: '1px solid var(--line)',
                        color: 'var(--muted)',
                      }}
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
      <Footer />
    </>
  );
}

export default function BookDemoPage() {
  return (
    <Suspense fallback={
      <>
        <Header />
        <div className="min-h-screen flex items-center justify-center" style={{ background: 'var(--bg)', color: 'var(--ink)' }}>
          <div className="max-w-md w-full">
            <div className="border rounded-lg p-8 text-center" style={{ borderColor: 'var(--line)', background: 'var(--panel)' }}>
              <h2 className="text-2xl font-bold mb-4" style={{ color: 'var(--ink)' }}>Loading...</h2>
              <p className="mb-6" style={{ color: 'var(--muted)' }}>
                Please wait while we load the booking page.
              </p>
            </div>
          </div>
        </div>
        <Footer />
      </>
    }>
      <BookDemoContent />
    </Suspense>
  );
}


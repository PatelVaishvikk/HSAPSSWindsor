import React, { useEffect, useState } from 'react';
import { Toast, ToastContainer } from 'react-bootstrap';
import { FaBirthdayCake } from 'react-icons/fa';

const BirthdayReminder = () => {
  const [birthdays, setBirthdays] = useState([]);
  const [showToast, setShowToast] = useState(false);
  const [notificationPermission, setNotificationPermission] = useState('default');

  // Check for birthdays
  const checkBirthdays = async () => {
    try {
      const res = await fetch('/api/notifications/birthdays');
      if (!res.ok) throw new Error('Failed to fetch birthdays');
      const data = await res.json();
      
      if (data.birthdays.length > 0) {
        setBirthdays(data.birthdays);
        setShowToast(true);
        
        // Show browser notification if permitted
        if (notificationPermission === 'granted') {
          const notification = new Notification('Student Birthdays Today!', {
            body: `${data.birthdays.length} student(s) have birthdays today!`,
            icon: '/favicon.ico'
          });
          
          notification.onclick = () => {
            window.focus();
            setShowToast(true);
          };
        }
      }
    } catch (error) {
      console.error('Error checking birthdays:', error);
    }
  };

  // Request notification permission
  const requestNotificationPermission = async () => {
    if (!('Notification' in window)) {
      return;
    }

    try {
      const permission = await Notification.requestPermission();
      setNotificationPermission(permission);
      
      // If permission granted, set up notifications
      if (permission === 'granted') {
        checkBirthdays();
      }
    } catch (error) {
      console.error('Error requesting notification permission:', error);
    }
  };

  // Check birthdays on mount and set up daily check
  useEffect(() => {
    // Request notification permission if not already granted
    if (notificationPermission === 'default') {
      requestNotificationPermission();
    }

    // Check birthdays immediately
    checkBirthdays();

    // Set up daily check at 9:00 AM
    const now = new Date();
    const tomorrow = new Date(now);
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(9, 0, 0, 0);

    const timeUntilTomorrow = tomorrow.getTime() - now.getTime();

    // Check once per day
    const dailyCheck = () => {
      checkBirthdays();
      // Set up next check
      setTimeout(dailyCheck, 24 * 60 * 60 * 1000);
    };

    // Set up first check
    const initialTimer = setTimeout(() => {
      dailyCheck();
    }, timeUntilTomorrow);

    // Cleanup
    return () => {
      clearTimeout(initialTimer);
    };
  }, [notificationPermission]);

  return (
    <ToastContainer position="top-end" className="p-3" style={{ zIndex: 1070 }}>
      <Toast 
        show={showToast} 
        onClose={() => setShowToast(false)}
        bg="info"
        className="text-white"
      >
        <Toast.Header closeButton={false}>
          <FaBirthdayCake className="me-2" />
          <strong className="me-auto">Birthday Reminders</strong>
          <small>Today</small>
        </Toast.Header>
        <Toast.Body>
          <div className="mb-2">
            {birthdays.length} student{birthdays.length !== 1 ? 's' : ''} have birthdays today!
          </div>
          <ul className="list-unstyled m-0">
            {birthdays.map(student => (
              <li key={student.id}>
                🎂 {student.name} ({student.age} years)
              </li>
            ))}
          </ul>
        </Toast.Body>
      </Toast>
    </ToastContainer>
  );
};

export default BirthdayReminder; 
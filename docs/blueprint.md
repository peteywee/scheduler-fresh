# **App Name**: Fresh Schedules

## Core Features:

- User Authentication: Secure sign-up, login, and password reset functionality using Firebase Authentication with Google and email/password options.
- Organization Management: Allows the first user to create an organization and become its admin. Supports inviting users to join existing organizations.
- Admin Schedule Creation: Enables admins to create new schedules for a specified date range, assign staff to shifts via a drag-and-drop interface, and publish the schedule, notifying staff.
- Staff Shift Management: Allows staff to view their assigned shifts and request shift swaps, drops, or time off. These requests require admin approval.
- Real-time Updates: Implements real-time schedule updates via Firestore listeners, ensuring all users are immediately informed of changes.
- Automated conflict tool: Uses an AI tool that flags possible staffing conflicts such as employees working elsewhere when scheduled or double-booked resources based on uploaded documentation about employee availability.

## Style Guidelines:

- Primary color: Teal (#008080) - a vibrant and easily readable teal to evoke a sense of calm and reliability in managing schedules. Dark mode: Dark teal (#004040).
- Background color: Light Cyan (#E0FFFF) - a light and unobtrusive background that is easy on the eyes. Dark mode: Dark gray (#333333).
- Accent color: Olive Green (#808000) - a vibrant color to highlight interactive elements and important actions, complementing the teal without overpowering it. Dark mode: Light olive (#AAAA00).
- Color-coded variations: Use shades of green for confirmed shifts, shades of orange for pending requests, and shades of red for conflicts. Ensure sufficient contrast in both light and dark modes.
- Font pairing: 'Roboto' (sans-serif) for headlines and 'Open Sans' (sans-serif) for body text, offering a modern and readable aesthetic. Ensure readability in both light and dark modes.
- Use clean, minimalist icons from a library like 'Font Awesome' to represent actions and data points in the schedule. Icons should be easy to understand and visually distinct. Ensure icons are visible in both light and dark modes.
- Implement a responsive, card-based layout for schedules and shift details, optimizing readability and interaction across devices. Ensure that key information is prominently displayed and easy to access in both light and dark modes.
- Incorporate subtle transition animations when updating or changing shifts to enhance user feedback and create a smoother experience. Animations should be quick and unobtrusive in both light and dark modes.
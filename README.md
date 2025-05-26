<div align="center">
  <h1 align="center"><a href="#">The DaktarBari App 🩺</a></h1>
  <p>
    This repository contains a web application that allows users to book appointments with doctors and enables healthcare professionals to manage their schedules efficiently. The system provides a dual functionality where:
  </p>

  
</div>

  - <strong>Patients</strong> can search for doctors and book appointments based on availability</li>
  - <strong>Doctors</strong> can register, add their practice locations, and manage their schedules</li>

<hr />
  
Used [The Epic Stack](https://www.epicweb.dev/epic-stack) as the starting point

<hr />

## Key Features

#### For Patients:

- Browse available doctors by specialty
- View doctor profiles and practice locations
- Book appointments based on real-time availability
- Receive confirmation of scheduled appointments

#### For Doctors:
- Registration: Any qualified professional can register as a doctor by completing a verification form
- Location Management:
  - Add multiple hospital/chamber locations
  - Set practice hours for each location
- Advanced Scheduling:
  - Create one-time, weekly, or monthly schedules in bulk
  -  Set different time slots for different days
  -  Define appointment duration per location
- Schedule Management:
    - Edit existing schedules
    - Delete schedules when needed
    - View all upcoming appointments
    - Check booked schedule info

## Technical Details
Backend: `sql, prisma`

Frontend: `react-router`

## Development

- Initial setup:
  - Clone the repository
    ```sh
    git clone git@github.com:alifhaider/daktarbari.git
    ```
  - install packages
    ```sh
    npm install
    ```
  - Run Setup Script
    ```sh
    npm run setup
    ```
  - Start Dev Server
    ```sh
    npm run dev
    ```

This starts your app in development mode, rebuilding assets on file changes.

The database seed script creates a new user with some data you can use to get
started:

- Username: `alif`
- Password: `222222`

## Docs

[Read the docs](https://github.com/epicweb-dev/epic-stack/blob/main/docs)
(Follow the documentation of Epic-Web if you want to know more about how things
work).

## Thanks

You rock 🪨

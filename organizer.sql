-- Step 1: Create the database
CREATE DATABASE EventManagement;
USE EventManagement;

-- Step 2: Venues (One Venue → Many Events)
CREATE TABLE Venues (
    venue_id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100) NOT NULL UNIQUE,
    location VARCHAR(255),
    capacity INT NOT NULL
);

-- Step 3: Organizers (One Organizer → Many Events)
CREATE TABLE Organizers (
    organizer_id INT AUTO_INCREMENT PRIMARY KEY,
    full_name VARCHAR(100) NOT NULL,
    email VARCHAR(100) NOT NULL UNIQUE,
    phone VARCHAR(15) UNIQUE
);

-- Step 4: Events (Many Events ← One Organizer, One Venue)
CREATE TABLE Events (
    event_id INT AUTO_INCREMENT PRIMARY KEY,
    title VARCHAR(150) NOT NULL,
    description TEXT,
    event_date DATE NOT NULL,
    event_time TIME NOT NULL,
    venue_id INT NOT NULL,
    organizer_id INT NOT NULL,
    FOREIGN KEY (venue_id) REFERENCES Venues(venue_id),
    FOREIGN KEY (organizer_id) REFERENCES Organizers(organizer_id)
);

-- Step 5: EventDetails (One-to-One with Events)
CREATE TABLE EventDetails (
    event_id INT PRIMARY KEY,  -- same as Events.event_id
    dress_code VARCHAR(100),
    theme VARCHAR(100),
    notes TEXT,
    FOREIGN KEY (event_id) REFERENCES Events(event_id)
);

-- Step 6: Attendees (Each attendee can attend many events)
CREATE TABLE Attendees (
    attendee_id INT AUTO_INCREMENT PRIMARY KEY,
    full_name VARCHAR(100) NOT NULL,
    email VARCHAR(100) NOT NULL UNIQUE,
    phone VARCHAR(15)
);

-- Step 7: Tickets (Many-to-Many between Events and Attendees)
CREATE TABLE Tickets (
    ticket_id INT AUTO_INCREMENT PRIMARY KEY,
    event_id INT NOT NULL,
    attendee_id INT NOT NULL,
    ticket_type ENUM('Regular', 'VIP', 'Student') NOT NULL,
    price DECIMAL(8, 2) NOT NULL,
    issued_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(event_id, attendee_id),  -- prevent duplicate ticket for same event/attendee
    FOREIGN KEY (event_id) REFERENCES Events(event_id),
    FOREIGN KEY (attendee_id) REFERENCES Attendees(attendee_id)
);

-- Step 8: Event Schedule (One Event → Many Sessions)
CREATE TABLE EventSchedule (
    schedule_id INT AUTO_INCREMENT PRIMARY KEY,
    event_id INT NOT NULL,
    session_title VARCHAR(100) NOT NULL,
    speaker VARCHAR(100),
    start_time TIME NOT NULL,
    end_time TIME NOT NULL,
    FOREIGN KEY (event_id) REFERENCES Events(event_id)
);

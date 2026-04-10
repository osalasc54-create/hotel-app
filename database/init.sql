CREATE DATABASE IF NOT EXISTS hotel_devops_db;
USE hotel_devops_db;

CREATE TABLE IF NOT EXISTS users (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(100),
  email VARCHAR(150) UNIQUE,
  password VARCHAR(255),
  role VARCHAR(20) DEFAULT 'user'
);

CREATE TABLE IF NOT EXISTS hotels (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(150),
  location VARCHAR(150),
  price DECIMAL(10,2)
);

CREATE TABLE IF NOT EXISTS reservations (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT,
  hotel_id INT,
  start_date DATE,
  end_date DATE,
  total_price DECIMAL(10,2),
  guests INT,
  rooms INT
);

INSERT INTO hotels (name, location, price) VALUES
('Hotel Monterrey Centro', 'Monterrey', 1200),
('Hotel San Pedro Premium', 'San Pedro', 2200),
('Hotel Cancun Beach', 'Cancun', 3500);
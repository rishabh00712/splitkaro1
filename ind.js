import pkg from 'pg';
// Import dotenv and call config() method
import dotenv from 'dotenv';
dotenv.config();

const { Client } = pkg;

// Your NeonDB Connection String
const connectionString =process.env.DB_URL;
// Initialize PostgreSQL Client
const client = new Client({
    connectionString,
    ssl: { rejectUnauthorized: false }, // Required for NeonDB
});

const createUsersTable = async () => {
    try {
        await client.connect(); // Connect to the database
        console.log("Connected to NeonDB ✅");

        await client.query(`
           INSERT INTO payment_panding (category, description, payment, date, time) VALUES
('Food', 'Dinner party', 450.75, '2025-03-10', '08:30 PM'),
('Groceries', 'Bulk shopping', 520.00, '2025-03-11', '10:00 AM'),
('Travel', 'Flight ticket', 980.50, '2025-03-12', '03:45 PM'),
('Stays', 'Luxury hotel', 1500.00, '2025-03-14', '06:20 PM'),
('Bills', 'Annual electricity', 620.90, '2025-03-15', '12:10 PM'),
('Subscription', 'Yearly software', 400.00, '2025-03-16', '11:59 PM'),
('Shopping', 'Designer clothes', 750.00, '2025-03-17', '04:30 PM'),
('Gifts', 'Wedding gift', 900.00, '2025-03-18', '06:45 PM'),
('Drinks', 'Bar night', 430.20, '2025-03-19', '08:00 PM'),
('Fuel', 'Full tank', 500.00, '2025-03-20', '10:15 AM');




        `);


        console.log("Table 'users' created successfully ✅");

    } catch (err) {
        console.error("Error creating table ❌", err);
    } finally {
        await client.end(); // Close the connection
    }
};

// Run the function
createUsersTable();

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
        
        await client.query(
          `UPDATE user_info SET payment_intime = $1, late_payment = $2 WHERE id = 1`,
          [14, 6]  // Correctly pass the values as an array
        );
        
        console.log("Table 'users' created successfully ✅");

    } catch (err) {
        console.error("Error creating table ❌", err);
    } finally {
        await client.end(); // Close the connection
    }
};

// Run the function
createUsersTable();

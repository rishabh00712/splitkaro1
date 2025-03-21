import express from "express";
import path from "path";
import { fileURLToPath } from "url";
import pkg from "pg";
import { render } from "ejs";
import { group, time } from "console";
// Import dotenv and call config() method
import dotenv from 'dotenv';
dotenv.config();



const { Client } = pkg;

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const connectionString =process.env.DB_URL;
const apiKey = process.env.API_KEY;

const app = express();
const PORT = 4000;

const client = new Client({
  connectionString,
  ssl: { rejectUnauthorized: false }, // Required for NeonDB
});

// Now connect to the database
client
  .connect()
  .then(() => console.log("Connected to NeonDB ✅"))
  .catch((err) => console.error("Connection error ❌", err));



// Middleware to parse URL-encoded data
app.use(express.urlencoded({ extended: true }));
app.use(express.static("public"));
app.use(express.static("images"));



// Set EJS as the view engine
app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));
//.......................................
app.get("/",(req,res)=>{
  res.render("login");
})
//............................................

app.post("/login",(req,res)=>{
  if(req.body.email=="test@gmail.com" && req.body.password=="test123"){
    res.render("infosubmit");
  }else{
    res.redirect("/?error=Use the Given Email Id and Password to Login ❌");
  }
  
})

//..................................
app.get("/submitinfo",(req,res)=>{
  res.render("infosubmit");
});

function getBudgetAdvice(monthlyBudget, totalSpend) {
  const remaining = monthlyBudget - totalSpend;
  const today = new Date();
  const lastDayOfMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0);
  const daysLeft = lastDayOfMonth.getDate() - today.getDate();
  let advise2 = "";

  if (remaining < 0) {
    advise2 = `🚨 You've gone over budget by ₹${Math.abs(remaining)}! It's time to pause and reevaluate your spending habits. Consider cutting down on unnecessary expenses to get back on track next month.`;
  } else if (remaining <= 2000) {
    advise2 = `⚠️ You're dangerously close to exceeding your budget, with only ₹${remaining} left for the rest of the month. Be extra mindful of your spending decisions and prioritize only the most essential expenses.`;
  } else {
    if (daysLeft > 10 && remaining < monthlyBudget * 0.3) {
      advise2 = `⚠️ You have ₹${remaining} left, but there are still ${daysLeft} days remaining in the month. At this rate, you might run out of funds too soon. Consider adjusting your spending to ensure you have enough for the remaining days.`;
    } else if (daysLeft <= 10 && remaining > monthlyBudget * 0.3) {
      advise2 = `✅ Great job! You still have ₹${remaining} left, and there are only ${daysLeft} days left in the month. You're on track to finish strong—keep making smart financial choices to end the month with a healthy balance.`;
    } else {
      advise2 = `You're managing your budget well! With ₹${remaining} still available, you have a comfortable buffer. Continue tracking your expenses and making thoughtful spending decisions to maintain this good progress.`;
    }
  }

  return advise2;
}


app.post("/submitinfo", async (req, res) => {
  const { name, amount } = req.body;
  console.log("User Name:", name);
  console.log("Amount:", amount);

  try {
    // update the amount and name 
    await client.query(
      `UPDATE user_info SET name = $1, maxi_amount = $2 WHERE id = 1`, 
      [name, amount]
  );

    // Fetch spending category data
    const spendResult = await client.query("SELECT * FROM catagory_payment");
    const spendData = spendResult.rows;

    // Fetch data from `payment_panding`
    const pendingResult = await client.query("SELECT * FROM payment_panding");
    const pendingData = pendingResult.rows;

    // Fetch data from `groups`
    const groupsResult = await client.query("SELECT * FROM groups");
    const groupsData = groupsResult.rows;

    const result2 = await client.query("SELECT total_spend FROM catagory_payment");
    const values = result2.rows.map(row => +row.total_spend || 0);
    const totalSum = values.reduce((acc, val) => acc + val, 0);

    // Convert spend data into a readable summary
    const spendSummary = spendData.map(row => `${row.category}: ₹${row.total_spend}`).join(", ");

    // second notifiaction 
    const advice2 = getBudgetAdvice(amount, totalSum);

    // Send request to Gemini API
    // Use a secure method to store this
    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`;

    const prompt = `Imagine you are a personal money-spending advice bot.
    The user "${name}" has a maximum spending amount of ₹${amount}.
    Here is their recent spending data: ${spendSummary}.So as you can see my total spanding of this month is ${totalSum}
    Give friendly advice on how to manage their budget efficiently in 45 words and write like you are instruction me.`;

    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }]
      }),
    });

    const data = await response.json();

    // Extract advice from the response
    let advice = "No response from AI"; // Default fallback message
    if (data?.candidates?.length > 0 && data.candidates[0]?.content?.parts?.length > 0) {
      advice = data.candidates[0].content.parts[0].text || advice;
    }
    // notification 3 
    let advise3 = "A payment is due soon. Make the payment on time to avoid a reduction in your stars. Ensure timely payment and continue enjoying our services on SplitKaro.";

    
    // Convert advice to a list format: ["full advice string"]
    const adviceList = [advice.trim(), advice2.trim(),advise3.trim()];
   
    
    
    
    // Render response, passing the list as JSON
    res.render("index.ejs", { notifications: adviceList, groups: groupsData,pendings:pendingData });
    
  } catch (err) {
    console.error("❌ Error updating profile. Try Again Later", err);
    res.redirect("/submitinfo?error=Error updating profile. Try Again Later❌");
  }
});


//....................................
app.get("/home",async (req, res) => {
      // Fetch data from `payment_panding`
      const pendingResult = await client.query("SELECT * FROM payment_panding");
      const pendingData = pendingResult.rows;

    // Fetch data from `groups`
    const groupsResult = await client.query("SELECT * FROM groups");
    const groupsData = groupsResult.rows;
 
  res.render("index", { notifications: null,
    groups:groupsData,
    pendings:pendingData
   }); // Directly passing the array
});
//.........................................................................
app.get("/profile", async (req, res) => {
  try {
    // Fetch the first user's details (Modify query if needed)
    const result = await client.query("SELECT * FROM user_info LIMIT 1");

    if (result.rows.length === 0) {
      return res.status(404).send("User not found");
    }

    // Extract user data
    const user = result.rows[0];

    const result2 = await client.query("SELECT total_spend FROM catagory_payment");
    const values = result2.rows.map(row => +row.total_spend || 0);
    const totalSum = values.reduce((acc, val) => acc + val, 0);
    // Convert to numbers// Extract total_spend values
    
    
    res.render("profile", {
      name: user.name,
      amount: user.maxi_amount,
      stars: user.stars,
      correct: user.payment_intime,
      late: user.late_payment,
      values:values,
      total_sum:totalSum
    });
  } catch (err) {
    console.error("Error fetching user data ❌", err);
    res.redirect("/profile?error=Server Error ❌");
  }
});

app.post("/update-profile", async (req, res) => {
  const { name, amount } = req.body;
  console.log(name);

  try {
      await client.query(
          `UPDATE user_info SET name = $1, maxi_amount = $2 WHERE id = 1`, 
          [name, amount]
      );
      res.redirect("/profile");
  } catch (err) {
    res.redirect("/profile?error=Error updating profile ❌");
      console.error("Error updating profile ❌", err);
      
  }
});

//.........................................................................
app.get("/new", (req, res) => {
 res.render("newgrp",{
  amount:null,
  category:null,
  date:null,
  time:null,
 });
});

app.post("/new", async (req, res) => {
  const { description, amount, category, date, time } = req.body;

  try {
    // Step 1: Insert the new group data into the 'groups' table
    await client.query(
      `INSERT INTO groups (category, description, payment, date, time)
       VALUES ($1, $2, $3, $4, $5)`,
      [category, description, amount, date, time]
    );

    // Step 2: Update the total_spend for the corresponding category
    await client.query(
      `UPDATE catagory_payment
       SET total_spend = total_spend + $1
       WHERE category = $2`,
      [parseFloat(amount), category] // Add the amount to the existing total_spend
    );
    console.log(parseFloat(amount));
    console.log(category);
    // Redirect to profile after successful insertion
    res.redirect("/home");

  } catch (err) {
    // Handle error and redirect to profile with error message
    res.redirect("/home?error=Error adding group ❌");
    console.error("Error adding group ❌", err);
  }
});
//............................................................

// In-memory storage for expenses
// 🏠 Home Route - Show expenses
app.get("/quickadd", async (req, res) => {
  try {
    // Fetch all rows from the transactions table
    const result = await client.query("SELECT * FROM transactions");

    // Send the data (all rows) to the 'quickadd' view
    res.render("quickadd", {
      expenses: result.rows, // result.rows will contain all rows from the table
      notificationMessage: null
    });
  } catch (err) {
    console.error("Error fetching transactions:", err);

    // Redirect to a specific route with an error message
    res.redirect("/error?message=Error fetching transactions ❌");
  }
});



// ➕ Add Expense
app.post("/add-expense", async (req, res) => {
  const { amount, category } = req.body;

  if (!amount || !category) {
    return res.redirect(`/quickadd`);
  }

  // Get the current date and time
  const date = new Date().toLocaleDateString();
  const formattedTime = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true });
const time = formattedTime.replace(/(am|pm)/, (match) => match.toUpperCase());


  try {
    // Insert the new expense into the database
    await client.query(
      `INSERT INTO transactions (category, amount, date, time) 
       VALUES ($1, $2, $3, $4)`,
      [category, amount, date, time]
    );

    // Redirect to the quickadd page after successful insertion
    res.redirect(`/quickadd`);
  } catch (err) {
    console.error("Error inserting expense into database ❌", err);
    res.redirect(`/quickadd?error=Error adding expense ❌`);
  }
});


// 🗑 Delete Expense
app.get("/delete_expense/:id", async (req, res) => {
  try {
    const expenseId = parseInt(req.params.id); // Convert ID to number

    // Check if ID is valid
    if (isNaN(expenseId)) {
      return res.redirect("/quickadd?error=Invalid expense ID");
    }

    // Delete expense from the database using a SQL query
    await client.query(
      `DELETE FROM transactions WHERE id = $1`,
      [expenseId]
    );

    // Redirect back to the quickadd page after deletion
    res.redirect("/quickadd");
  } catch (error) {
    console.error("Error deleting expense:", error);
    res.redirect("/quickadd?error=Error deleting expense");
  }
});



app.get("/add/:id", async (req, res) => {
  try {
    const expenseId = parseInt(req.params.id); // Fetch the ID from URL params and convert to integer

    // Check if ID is valid
    if (isNaN(expenseId)) {
      return res.redirect("/quickadd?error=Invalid expense ID");
    }

    // Fetch the expense data from the database based on the ID
    const result = await client.query(
      `SELECT * FROM transactions WHERE id = $1`, 
      [expenseId]
    );

    console.log(result.rows[0])
    // Check if the expense was found
    if (result.rows.length === 0) {
      return res.redirect("/quickadd?error=Expense not found");
    }
     // Delete expense from the database using a SQL query
     await client.query(
      `DELETE FROM transactions WHERE id = $1`,
      [expenseId]
    );

    const expense = result.rows[0]; // Get the expense data

    // Render the 'newgrp' view with the fetched values
    res.render("newgrp", {
      amount: expense.amount,
      category: expense.category,
      date: expense.date,
      time: expense.time,
    });

  } catch (error) {
    console.error("Error fetching expense:", error);
    res.redirect("/quickadd?error=Error fetching expense details");
  }
});


//.................................................................................
app.get("/voiceadd", (req, res) => {
  res.render("voiceadd");
});

// Endpoint to receive the voice transcript
// POST endpoint to handle voice expense data

app.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
});

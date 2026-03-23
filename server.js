const express = require("express");
const mongoose = require("mongoose");
const bodyParser = require("body-parser");
const path = require("path");
const nodemailer = require("nodemailer");
require("dotenv").config();

const app = express();

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// serve static files from current folder (dist)
app.use(express.static("public"));

// homepage route
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

// MongoDB connect
mongoose
  .connect(process.env.MONGO_URI)
  .then(() => console.log("MongoDB Connected"))
  .catch((err) => console.log(err));

// Schema
const appointmentSchema = new mongoose.Schema({
  firstName: String,
  lastName: String,
  email: String,
  mobile: String,
  disease: String,
  address: String,
  date: String,
  slot: String,
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

// Prevent duplicate date + slot
appointmentSchema.index({ date: 1, slot: 1 }, { unique: true });

const Appointment = mongoose.model("Appointment", appointmentSchema);

// Form submit
app.post("/book", async (req, res) => {
  try {
    const { country, state, city } = req.body;
    const address = `${city}, ${state}, ${country}`;
    const { date, slot, email, firstName, lastName, mobile, disease } =
      req.body;

    // Check duplicate slot
    const existingAppointment = await Appointment.findOne({ date, slot });

    if (existingAppointment) {
      return res.send(`
        <!DOCTYPE html>
        <html>
        <head>
          <script src="https://cdn.tailwindcss.com"></script>
        </head>
        <body class="bg-slate-100 flex items-center justify-center min-h-screen">
          <div class="bg-white shadow-2xl rounded-2xl p-10 max-w-md w-full text-center">
            <h2 class="text-2xl font-bold text-red-600 mb-4">Slot Already Booked</h2>
            <p class="text-slate-600 mb-6">
              The selected time slot is not available.
            </p>
            <a href="/" class="bg-green-600 text-white px-6 py-2 rounded-lg">
              ← Go Back
            </a>
          </div>
        </body>
        </html>
      `);
    }

    // Save appointment
    const newAppointment = new Appointment({
      firstName,
      lastName,
      email,
      mobile,
      disease,
      address,
      date,
      slot,
    });
    await newAppointment.save();

    // EMAIL SETUP
    const transporter = nodemailer.createTransport({
      service: "gmail",
      auth: {
        user: process.env.EMAIL_USER, // 🔁 replace
        pass: process.env.EMAIL_PASS, // 🔁 replace (NOT normal password)
      },
    });

    // 📩 Email to Patient
    await transporter.sendMail({
      from: "VedAmrut Healthcare <yourgmail@gmail.com>",
      to: email,
      subject: "Appointment Confirmed ✔",
      html: `
        <p><strong>Name:</strong> ${firstName} ${lastName}</p>
        <p>Your appointment is confirmed.</p>
        <p><strong>Date:</strong> ${date}</p>
        <p><strong>Slot:</strong> ${slot}</p>
        <p>Please arrive 10 minutes early.</p>
        <br/>
        <p>Thank you,<br/>VedAmrut Healthcare</p>
      `,
    });

    // 📩 Email to Doctor
    await transporter.sendMail({
      from: "VedAmrut Healthcare <yourgmail@gmail.com>",
      to: "dr.amrutapatil.2025@gmail.com", // 🔁 replace with doctor email
      subject: "New Appointment Booked 📩",
      html: `
        <h2>New Appointment Registered</h2>
        <p><strong>Name:</strong> ${firstName} ${lastName}</p>
        <p><strong>Mobile:</strong> ${mobile}</p>
        <p><strong>Email:</strong> ${email}</p>
        <p><strong>Date:</strong> ${date}</p>
        <p><strong>Slot:</strong> ${slot}</p>
        <p><strong>Concern:</strong> ${disease}</p>
        <p><strong>Address:</strong> ${address}</p>
      `,
    });

    res.redirect("/success.html");
  } catch (error) {
    console.error("BOOKING ERROR:", error);
    res.status(500).send(error.message);
  }
});

// start server
const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});

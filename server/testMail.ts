import dotenv from "dotenv";
dotenv.config();

import { sendBookingEmail } from "./negocio/email/mailer.ts";

async function testEmail() {
    try {
        await sendBookingEmail("tucorreo@gmail.com", {
            date: "2025-11-18",
            startTime: "10:00",
            endTime: "11:00",
            roomId: 3
        });
        console.log("Correo enviado correctamente ✔");
    } catch (err) {
        console.error("Error enviando correo:", err);
    }
}

testEmail();
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Cargar .env de la raíz del proyecto
dotenv.config({ path: path.resolve(__dirname, '../../../.env') });

import nodemailer from "nodemailer";

export const mailer = nodemailer.createTransport({
    service: "gmail",
    auth: {
        user: process.env.MAIL_USER,
        pass: process.env.MAIL_PASS,
    },
});
console.log("MAIL_USER:", process.env.MAIL_USER);
console.log("MAIL_PASS:", process.env.MAIL_PASS);

export async function sendBookingEmail(to: string, bookingData: any) {
    const mailOptions = {
        from: `"Sistema de Reservas" <${process.env.MAIL_USER}>`,
        to,
        subject: "Nueva reserva de paciente",
        html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 8px; background-color: #f9f9f9;">
                <h2 style="color: #333; text-align: center;">Nueva reserva registrada</h2>
                <p style="color: #555; font-size: 16px;">Estimado/a</p>
                <p style="color: #555; font-size: 16px;">
                    Se ha registrado una nueva sesión con su paciente. A continuación, encontrará los detalles:
                </p>
                
                <table style="width: 100%; border-collapse: collapse; margin-top: 20px;">
                    <tr style="background-color: #f1f1f1;">
                        <td style="padding: 10px; font-weight: bold; color: #333;">Fecha:</td>
                        <td style="padding: 10px; color: #555;">${bookingData.date}</td>
                    </tr>
                    <tr>
                        <td style="padding: 10px; font-weight: bold; color: #333;">Hora de Inicio:</td>
                        <td style="padding: 10px; color: #555;">${bookingData.startTime} - ${bookingData.endTime}</td>
                    </tr>
                    <tr style="background-color: #f1f1f1;">
                        <td style="padding: 10px; font-weight: bold; color: #333;">Cubículo:</td>
                        <td style="padding: 10px; color: #555;">${bookingData.roomId}</td>
                    </tr>
                </table>

                <p style="color: #555; font-size: 16px; margin-top: 20px;">
                    Por favor, le recomendamos revisar la información y preparar los recursos necesarios para la sesión.
                </p>
            </div>
        `,
    };
    await mailer.sendMail(mailOptions);
}


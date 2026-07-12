interface EmailOpts {
  to: string;
  subject: string;
  text: string;
  html?: string;
}

// Pika e integrimit për dërgimin e email-eve (verifikim, rikthim fjalëkalimi).
// Në zhvillim shfaqet te console; në prodhim lidhu me një provejdër (Resend, SMTP, etj.).
export async function sendEmail({ to, subject, text }: EmailOpts): Promise<void> {
  if (process.env.SMTP_HOST || process.env.EMAIL_API_KEY) {
    // TODO: dërgo me nodemailer/Resend kur konfigurohen variablat e mjedisit.
  }
  console.log(`[email] To: ${to} | Subject: ${subject}\n${text}`);
}

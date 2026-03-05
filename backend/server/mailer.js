const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: 'supichaya.tho@ku.th',
        pass: 'gdii lfxu sjjq emfr'
    }
});

const sendVerifyEmail = async (userEmail, token) => {
    const url = `http://localhost:5173/verify-email?token=${token}`;
    console.log(`Attempting to send verification email to: ${userEmail}`);

    try {
        await transporter.sendMail({
            from: '"SalengMan Team" <supichaya.tho@ku.th>',
            to: userEmail,
            subject: "ยืนยันอีเมลของคุณ - SalengMan",
            html: `
      <h1>ยืนยันตัวตนเพื่อเริ่มใช้งาน SalengMan</h1>
      <p>คลิกปุ่มด้านล่างเพื่อยืนยันอีเมลของคุณ:</p>
      <a href="${url}" style="background: #ff6b00; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">ยืนยันอีเมล</a>
      <p>หรือคลิกที่ลิงก์นี้: ${url}</p>
    `
        });
        console.log(`Verification email sent successfully to: ${userEmail}`);
    } catch (error) {
        console.error(`Failed to send email to ${userEmail}:`, error);
        throw error;
    }
};

module.exports = { sendVerifyEmail };

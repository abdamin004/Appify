const QRCode = require('qrcode');

const generateQRCode = async (data) => {
    try {
        // Returns a Data URI (base64)
        return await QRCode.toDataURL(data);
    } catch (err) {
        console.error('Error generating QR code:', err);
        throw err;
    }
};

module.exports = { generateQRCode };

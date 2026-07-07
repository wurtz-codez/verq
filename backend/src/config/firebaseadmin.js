const admin = require('firebase-admin');

const isPlaceholder = (val) => !val || val.startsWith('your_');

try {
    if (!admin.apps.length) {
        console.log('Initializing Firebase Admin...');

        const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n');

        if (isPlaceholder(process.env.FIREBASE_PROJECT_ID) || isPlaceholder(privateKey)) {
            console.warn('Firebase Admin not initialized: placeholder credentials detected.');
        } else {
            const serviceAccount = {
                type: process.env.FIREBASE_TYPE,
                project_id: process.env.FIREBASE_PROJECT_ID,
                private_key_id: process.env.FIREBASE_PRIVATE_KEY_ID,
                private_key: privateKey,
                client_email: process.env.FIREBASE_CLIENT_EMAIL,
                client_id: process.env.FIREBASE_CLIENT_ID,
                auth_uri: process.env.FIREBASE_AUTH_URI,
                token_uri: process.env.FIREBASE_TOKEN_URI,
                auth_provider_x509_cert_url: process.env.FIREBASE_AUTH_PROVIDER_X509_CERT_URL,
                client_x509_cert_url: process.env.FIREBASE_CLIENT_X509_CERT_URL
            };

            admin.initializeApp({
                credential: admin.credential.cert(serviceAccount)
            });

            console.log('Firebase Admin initialized successfully');
        }
    } else {
        console.log('Firebase Admin already initialized');
    }
} catch (error) {
    console.error('Error initializing Firebase Admin:', error.message);
}

module.exports = admin; 
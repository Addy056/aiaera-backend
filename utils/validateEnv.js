export const validateEnv = () => {
  const requiredVars = [
    'SUPABASE_URL',
    'SUPABASE_SERVICE_ROLE_KEY',
    'GROQ_API_KEY',
    'JWT_SECRET',
    'JWT_EXPIRES_IN',
    'RAZORPAY_KEY_ID',
    'RAZORPAY_KEY_SECRET'
  ];

  const missing = requiredVars.filter((key) => !process.env[key]);

  if (missing.length) {
    console.error(`❌ Missing environment variables: ${missing.join(', ')}`);
    process.exit(1);
  }
};

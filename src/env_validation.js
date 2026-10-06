// Validate required environment variables
function validateRequiredEnvVars(requiredVars) {
  const missing = requiredVars.filter(varName => !import.meta.env[varName]);
  if (missing.length > 0) {
    console.error(`FATAL: Missing required environment variables: ${missing.join(', ')}`);
    process.exit(1);
  }
}

// Validate critical environment variables
// Note: VITE_API_BASE has a default value, but we still validate for consistency
validateRequiredEnvVars([
  'VITE_API_BASE'
]);
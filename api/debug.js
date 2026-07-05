module.exports = async (req, res) => {
  const envKeys = Object.keys(process.env).filter(key => 
    key.startsWith('KV') || 
    key.startsWith('REDIS') || 
    key.startsWith('UPSTASH') ||
    key.startsWith('VERCEL')
  );
  res.status(200).json({ envKeys });
};

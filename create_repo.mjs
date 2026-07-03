const resp = await fetch('https://api.github.com/user/repos', {
  method: 'POST',
  headers: {
    'Authorization': `token ${process.env.GITHUB_TOKEN}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({ name: 'aif-pulsewatch', description: 'Pulsewatch', private: false })
});
const data = await resp.json();
console.log('Status:', resp.status);
console.log('Repo:', data.full_name || '');
console.log('Message:', data.message || '');

const characters = require('./characters');

/**
 * 10-block progress bar ကို generate လုပ်ပေးမည့် function
 */
function generateProgressBar(percentage, length = 10) {
  const filledLength = Math.round((percentage / 100) * length);
  const emptyLength = length - filledLength;
  return '█'.repeat(filledLength) + '░'.repeat(emptyLength);
}

/**
 * Vote Data တွေကို Percentage ပြောင်းပြီး Message အဖြစ် ထုတ်ပေးမည့် function
 */
function formatVoteResults(votesData) {
  const totalVoters = votesData.length;
  if (totalVoters === 0) return "ယခုထိ မဲပေးထားသူ မရှိသေးပါ။";

  // Array index အလိုက် count တွက်ခြင်း
  const counts = new Array(characters.length).fill(0);
  votesData.forEach(row => {
    row.choices.forEach(idx => {
      if (idx >= 0 && idx < characters.length) {
        counts[idx]++;
      }
    });
  });

  // Calculate percentage & format
  const results = characters.map((name, idx) => {
    // User တစ်ယောက်က မဲပေးရင် % တွက်ရာမှာ Total Voters နဲ့ တွက်ပါတယ်
    const percentage = totalVoters > 0 ? ((counts[idx] / totalVoters) * 100).toFixed(1) : 0;
    return {
      name,
      count: counts[idx],
      percentage: parseFloat(percentage)
    };
  });

  // မဲအများဆုံးကနေ အနည်းဆုံးကို Sort လုပ်ခြင်း
  results.sort((a, b) => b.count - a.count);

  let message = `📊 **လက်ရှိ မဲပေးရလဒ်များ (စုစုပေါင်း မဲပေးသူ: ${totalVoters} ယောက်)**\n\n`;
  results.forEach(res => {
    const bar = generateProgressBar(res.percentage);
    message += `**${res.name}** - ${res.percentage}%\n`;
    message += `${bar} (${res.count} votes)\n\n`;
  });

  return message;
}

module.exports = { generateProgressBar, formatVoteResults };
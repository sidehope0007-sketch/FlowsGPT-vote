const { Telegraf, Markup } = require('telegraf');
const characters = require('./characters');
const db = require('./db');
const { formatVoteResults } = require('./utils');
require('dotenv').config();

const bot = new Telegraf(process.env.BOT_TOKEN);

// State string "1,4,10" ကို Array [1, 4, 10] အဖြစ်ပြောင်းပေးမည့် Helper Function
const parseState = (stateStr) => {
  if (!stateStr) return [];
  return stateStr.split(',').map(Number);
};

// Stateless Inline Keyboard တည်ဆောက်မည့် Function
const getVoteKeyboard = (selectedIdxs) => {
  const buttons = [];
  
  // ၂ ခု တစ်တန်းစီ ထည့်သွင်းခြင်း
  for (let i = 0; i < characters.length; i += 2) {
    const row = [];
    
    // First Button in row
    const isSel1 = selectedIdxs.includes(i);
    let newState1 = [...selectedIdxs];
    if (isSel1) newState1 = newState1.filter(x => x !== i);
    else if (newState1.length < 5) newState1.push(i);
    row.push(Markup.button.callback(`${isSel1 ? '✅ ' : ''}${characters[i]}`, `v:${newState1.join(',')}`));

    // Second Button in row (if exists)
    if (i + 1 < characters.length) {
      const isSel2 = selectedIdxs.includes(i + 1);
      let newState2 = [...selectedIdxs];
      if (isSel2) newState2 = newState2.filter(x => x !== i + 1);
      else if (newState2.length < 5) newState2.push(i + 1);
      row.push(Markup.button.callback(`${isSel2 ? '✅ ' : ''}${characters[i + 1]}`, `v:${newState2.join(',')}`));
    }
    buttons.push(row);
  }

  // ၅ ခု ပြည့်မှသာ Submit Vote ခလုတ်ကို ပြသမည်
  if (selectedIdxs.length === 5) {
    buttons.push([Markup.button.callback('✅ Submit Vote', `s:${selectedIdxs.join(',')}`)]);
  } else {
    buttons.push([Markup.button.callback(`ရွေးချယ်ရန် ${5 - selectedIdxs.length} ခု လိုသေးသည် ⏳`, 'noop')]);
  }

  return Markup.inlineKeyboard(buttons);
};

// ----------------------------------------------------
// [USER COMMANDS]
// ----------------------------------------------------

// User က Vote ပေးရန် Bot ၏ Private Chat သို့ ဝင်လာသောအခါ
bot.start(async (ctx) => {
  const payload = ctx.payload; // get the string after /start
  if (payload === 'vote' || ctx.chat.type === 'private') {
    const userId = ctx.from.id;
    const hasVoted = await db.hasUserVoted(userId);
    
    if (hasVoted) {
      const votesData = await db.getAllVotes();
      return ctx.replyWithMarkdown(
        "❌ သင်သည် မဲပေးပြီးဖြစ်ပါသည်။ ရလဒ်များကို အောက်တွင် ကြည့်ရှုနိုင်ပါသည်။\n\n" + formatVoteResults(votesData)
      );
    }
    
    return ctx.reply(
      "⭐️ ကျေးဇူးပြု၍ Character ၅ ခု တိတိ ရွေးချယ်ပေးပါ။ ၅ ခု ပြည့်မှ Submit ခလုတ် ပေါ်လာပါမည်။",
      getVoteKeyboard([])
    );
  }
});

// ----------------------------------------------------
// [ADMIN COMMANDS]
// ----------------------------------------------------

// Admin မှ Channel အတွင်း Vote Post တင်ရန်
bot.command('sendpoll', async (ctx) => {
  const botInfo = await bot.telegram.getMe();
  const botUsername = botInfo.username;
  
  const keyboard = Markup.inlineKeyboard([
    Markup.button.url('🗳️ မဲပေးရန် ဤနေရာကို နှိပ်ပါ', `https://t.me/${botUsername}?start=vote`)
  ]);

  ctx.reply("📢 **Character Vote စတင်ပါပြီ!**\n\nမိမိနှစ်သက်ရာ Character (၅) ခုကို ရွေးချယ်နိုင်ပါပြီ။ မဲပေးရန် အောက်ပါ ခလုတ်ကို နှိပ်ပြီး ဝင်ရောက်ရွေးချယ်ပါ။", 
    { parse_mode: 'Markdown', ...keyboard }
  );
});

// Admin မှ မဲစာရင်းအားလုံးကို ဖျက်ပစ်ပြီး အသစ်ပြန်စရန် (Global Reset)
bot.command('reset', async (ctx) => {
  const adminId = process.env.ADMIN_ID;
  const userId = ctx.from.id.toString();

  // Security Check: Admin မဟုတ်ပါက မသိချင်ယောင်ဆောင်မည် (Silent Ignore)
  if (userId !== adminId) return;

  const result = await db.resetAllVotes();
  
  if (!result.success) {
    return ctx.reply("❌ Database Error: မဲစာရင်း ဖျက်ရာတွင် အခက်အခဲရှိနေပါသည်။ နောက်တစ်ကြိမ် ပြန်စမ်းကြည့်ပါ။");
  }

  return ctx.reply("✅ မဲစာရင်းအားလုံးကို အောင်မြင်စွာ ရှင်းလင်းပြီးပါပြီ။ ယခုမှစ၍ အားလုံး အစမှ ပြန်လည်မဲပေးနိုင်ပါပြီ။");
});

// Admin မှ လက်ရှိမဲရလဒ်များကို အချိန်မရွေး စစ်ဆေးရန် (Live Result Check)
bot.command('result', async (ctx) => {
  const adminId = process.env.ADMIN_ID;
  const userId = ctx.from.id.toString();

  // Security Check: Admin မဟုတ်ပါက မသိချင်ယောင်ဆောင်မည် (Silent Ignore)
  if (userId !== adminId) return;

  const votesData = await db.getAllVotes();
  const resultMsg = formatVoteResults(votesData);
  
  return ctx.replyWithMarkdown(resultMsg);
});

// ----------------------------------------------------
// [ACTION HANDLERS]
// ----------------------------------------------------

// Character ခလုတ်တစ်ခုချင်းစီကို နှိပ်သောအခါ
bot.action(/^v:(.*)$/, async (ctx) => {
  const stateStr = ctx.match[1];
  const selectedIdxs = parseState(stateStr);
  
  try {
    await ctx.editMessageReplyMarkup(getVoteKeyboard(selectedIdxs).reply_markup);
    await ctx.answerCbQuery();
  } catch (err) {
    // Message မပြောင်းလဲဘဲ ထပ်နှိပ်မိသော Error များကို လျစ်လျူရှုရန်
    await ctx.answerCbQuery("ရွေးချယ်ပြီးဖြစ်ပါသည်။").catch(()=>console.log("Cb Error"));
  }
});

// ၅ ခုမပြည့်သေးဘဲ သတိပေးခလုတ် (⏳) နှိပ်မိသောအခါ
bot.action('noop', async (ctx) => {
  await ctx.answerCbQuery("❗️ စုစုပေါင်း ၅ ခု တိတိ ရွေးချယ်ပေးရပါမည်။", { show_alert: true });
});

// ၅ ခုပြည့်၍ Submit Vote ခလုတ်နှိပ်သောအခါ
bot.action(/^s:(.*)$/, async (ctx) => {
  const stateStr = ctx.match[1];
  const selectedIdxs = parseState(stateStr);
  
  // Security Validation: 5 ခု တိတိ ဟုတ်/မဟုတ် Server Side မှ ထပ်မံစစ်ဆေးခြင်း
  if (selectedIdxs.length !== 5) {
    return ctx.answerCbQuery("❗️ ၅ ခု တိတိ ရွေးချယ်ရပါမည်။ System error.", { show_alert: true });
  }

  const userId = ctx.from.id;
  const username = ctx.from.username || ctx.from.first_name;

  // Database တွင် မဲပေးပြီးသား ဟုတ်/မဟုတ် စစ်ဆေးခြင်း
  const hasVoted = await db.hasUserVoted(userId);
  if (hasVoted) {
    await ctx.answerCbQuery("သင်သည် မဲပေးပြီးဖြစ်ပါသည်။", { show_alert: true });
    return ctx.editMessageText("❌ သင်သည် မဲပေးပြီးဖြစ်ပါသည်။");
  }

  // Database ထဲသို့ မဲဒေတာ သိမ်းဆည်းခြင်း
  const result = await db.saveVote(userId, username, selectedIdxs);
  if (!result.success) {
    console.error(result.error);
    return ctx.answerCbQuery("မဲပေးရာတွင် အခက်အခဲရှိနေပါသည်။ ခဏနေမှ ထပ်စမ်းကြည့်ပါ။", { show_alert: true });
  }

  await ctx.answerCbQuery("✅ မဲပေးခြင်း အောင်မြင်ပါသည်။ ကျေးဇူးတင်ပါတယ်။", { show_alert: true });

  // Update Message with Current Live Results
  const votesData = await db.getAllVotes();
  const resultMsg = formatVoteResults(votesData);
  
  await ctx.editMessageText(resultMsg, { parse_mode: 'Markdown' });
});

// ----------------------------------------------------
// [ERROR HANDLING]
// ----------------------------------------------------
bot.catch((err, ctx) => {
  console.error(`Bot Error for ${ctx.updateType}:`, err);
});

module.exports = bot;

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_KEY;

if (!supabaseUrl || !supabaseKey) {
  throw new Error("Supabase credentials missing in .env file");
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function hasUserVoted(userId) {
  const { data, error } = await supabase
    .from('votes')
    .select('user_id')
    .eq('user_id', userId)
    .single();
  
  if (error && error.code !== 'PGRST116') { // PGRST116 = No rows found
    console.error("DB Error checking vote status:", error);
  }
  return !!data;
}

async function saveVote(userId, username, choices) {
  const { error } = await supabase
    .from('votes')
    .insert([{ user_id: userId, username, choices }]);
  
  return { success: !error, error };
}

async function getAllVotes() {
  const { data, error } = await supabase
    .from('votes')
    .select('choices');
  
  if (error) {
    console.error("DB Error fetching votes:", error);
    return [];
  }
  return data;
}

/**
 * [SECURITY: DANGER ZONE]
 * Database ထဲရှိ Vote Data အားလုံးကို ရှင်းလင်းမည့် Function
 */
async function resetAllVotes() {
  const { error } = await supabase
    .from('votes')
    .delete()
    .not('user_id', 'is', null); // user_id ရှိသော Row အားလုံးကို ဖျက်မည်
  
  if (error) {
    console.error("DB Error resetting votes:", error);
  }
  
  return { success: !error, error };
}

module.exports = { hasUserVoted, saveVote, getAllVotes, resetAllVotes };

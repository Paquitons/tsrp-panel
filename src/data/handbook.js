// ============================================================
//  STAFF HANDBOOK -- content, kept apart from how it is rendered
//
//  Structured rather than written as JSX for two reasons:
//
//    * The page filters sections as you type. Searching structured data
//      means one precomputed text blob per section; searching rendered
//      JSX would mean reaching into the DOM for textContent, which is
//      the kind of thing that works until somebody adds a component.
//    * Editing a policy should not mean editing a React component.
//      Everything below is plain data, so a wording change is a one-line
//      edit in one file.
//
//  Block types the renderer understands: h3, p, list, steps, table,
//  defs, note, reqs. Anything else is ignored rather than crashing the
//  page, so a half-finished block can never take the handbook down.
//
//  ---- Keeping this true ----
//  Every rank threshold, duration and limit below was read off the live
//  code, not carried over from the previous handbook. Where a policy is
//  real but lives nowhere in code (the punishment tiers, the 20-player
//  RP rule, the review criteria), it is carried forward as policy. Where
//  the repositories genuinely disagree with each other, the section says
//  so in a `note` with variant "open" rather than picking a side
//  quietly.
// ============================================================

export const HANDBOOK_CODES = [
  { label: "ER:LC server", value: "TexStRP" },
  { label: "Discord", value: "tsrp7" },
];

export const HANDBOOK_GROUPS = [
  { key: "start", label: "Starting out" },
  { key: "duty", label: "On duty" },
  { key: "moderation", label: "Moderation" },
  { key: "support", label: "Tickets and support" },
  { key: "record", label: "Your record" },
  { key: "oversight", label: "Oversight" },
  { key: "reference", label: "Reference" },
];

export const HANDBOOK = [
  // ------------------------------------------------------------------
  {
    id: "joining", group: "start", title: "Joining the staff team",
    blocks: [
      { type: "p", text: "Four things have to be true before you can take a staff action. None of them are optional, and three of them are enforced by the system rather than by trust." },

      { type: "h3", text: "Verify your Roblox account" },
      { type: "p", text: "Verification is what connects your Discord account to your Roblox account. Until it is done you cannot open the Staff Panel and you cannot receive in-game moderator powers, because nothing knows which player in the server is you." },
      { type: "p", text: "Normally you verify through Roblox itself when you join the Discord, which grants you the Verified role. The first time you open the Staff Panel it asks you to confirm the linked account is yours. Confirm it once and the panel opens." },
      { type: "note", title: "If you are under 13", body: "Roblox will not run its sign-in flow for accounts under 13, so the normal route is impossible for you. A Director can open a one-time alternative for your account specifically, and the bot will DM you step-by-step instructions and a link. Open a ticket and ask; do not try to work around it with another account." },

      { type: "h3", text: "If you lose your Discord account" },
      { type: "p", text: "Hacked, or had to start a new Discord account? You do not need to abandon your Roblox account, and nobody needs to edit the database for you." },
      { type: "list", items: [
        "**The old account is gone from the server.** Its claim on your Roblox account is released automatically when it leaves. Join on your new account and verify the same Roblox account as normal.",
        "**The old account is still in the server** (compromised, or you simply cannot get into it). Ask management to release the claim from the Account Verification page, then verify on the new one.",
      ]},
      { type: "p", text: "Verifying still means completing Roblox sign-in for that account, so releasing a claim hands nobody anything they could not already prove they own. Once your new account verifies, the old record is cleared and both sides of the handover are recorded." },
      { type: "p", text: "Leaving the server briefly and coming back costs you nothing: rejoining puts your claim straight back and you are not asked to verify again." },

      { type: "h3", text: "Your nickname" },
      { type: "p", text: "Your Discord nickname is managed for you. The bot sets it to `PREFIX | Name` using your rank's prefix and re-applies it whenever your rank changes. Do not set it by hand. If it looks wrong, ask any Junior Supervisor or above to run `/fixnick` on you." },
      { type: "p", text: "Your prefix changes automatically while you are on duty, on break, or on LOA, so the state you are in is visible in the member list without anyone asking. Precedence is **LOA**, then **On Break**, then **On Duty**." },

      { type: "h3", text: "Your avatar" },
      { type: "note", variant: "hard", title: "Required", body: "You must be using a **blocky avatar** while moderating. Staff uniforms do not render correctly on other body types, and a staff member who does not look like staff is not recognisable to the players they are moderating. Change your avatar before you go on duty, not after somebody points it out." },

      { type: "h3", text: "Before your first shift" },
      { type: "list", items: [
        "Read this handbook in full. Every system below is live and most of them log what you do.",
        "Know which commands your rank actually has. Running something you are not entitled to does nothing except generate a refusal.",
        "Know where to escalate. When in doubt, ask before acting; that is always the right call and nobody will hold it against you.",
      ]},
    ],
  },

  // ------------------------------------------------------------------
  {
    id: "hierarchy", group: "start", title: "The hierarchy",
    blocks: [
      { type: "p", text: "Twenty-nine ranks in six bands. Your rank is the single highest rank role you hold, and it decides your nickname prefix, who you outrank, and what you can do everywhere except in game." },
      { type: "table", head: ["Rank", "Prefix", "Notes"], rows: [
        { tier: "Leadership" },
        ["Founder", "F", "Own the community and have final say. Directors and above process resignations and can delete tickets outright."],
        ["Co-Founder", "CF", ""],
        ["Director", "D", ""],
        ["Assistant Director", "AD", ""],
        ["Deputy Director", "DD", ""],
        ["Directors Board", "DB", ""],
        { tier: "Management" },
        ["Chief of Staff", "CoS", "Run the day to day. Community Management and above promote, demote, terminate, approve LOAs, and start and stop sessions."],
        ["Operations Management", "OM", ""],
        ["Community Management", "CM", ""],
        ["Management Team", "MT", ""],
        { tier: "Internal Affairs" },
        ["Internal Affairs Supervisor", "IAS", "Investigate staff. Oversight only: these ranks grant no in-game powers of their own."],
        ["Internal Affairs Officer", "IAO", ""],
        ["Internal Affairs", "IA", ""],
        ["Trial Internal Affairs", "TIA", ""],
        { tier: "Supervisory" },
        ["Head Supervisor", "HS", "The rung above Administration. Trial Supervisor is the floor for rank change requests, strikes and BOLO review."],
        ["Senior Supervisor", "SS", ""],
        ["Junior Supervisor", "JS", ""],
        ["Trial Supervisor", "TS", ""],
        { tier: "Administration" },
        ["Chief Administrator", "CA", "Full punishment access including bans and temp bans. Eligible for `:admin` in game."],
        ["Senior Administrator", "SA", ""],
        ["Administrator", "A", ""],
        ["Junior Administrator", "JA", ""],
        { tier: "Moderation" },
        ["Chief Moderator", "ChM", "Warnings, kicks, BOLOs and notes. Eligible for `:mod` in game."],
        ["Senior Moderator", "SM", ""],
        ["Moderator", "M", ""],
        ["Junior Moderator", "JM", ""],
        { tier: "Standalone" },
        ["Staff Trainer", "ST", "Runs training and passes or fails trainees. Kept through promotions and demotions."],
        ["Department Owners", "DO", "Community role rather than a moderation rank."],
        ["Staff Team", "—", "The base membership role everybody above also holds. No prefix."],
      ]},
      { type: "h3", text: "Roles that are not ranks" },
      { type: "p", text: "Three roles survive a promotion or demotion, because they describe a job rather than a level: **Support Staff**, **Staff Trainer** and **Application Reviewer**. Support Staff is what gives access to ordinary tickets regardless of rank, and it is required on top of Admin+ to handle ban appeals." },
    ],
  },

  // ------------------------------------------------------------------
  {
    id: "permissions", group: "start", title: "What your rank can do",
    blocks: [
      { type: "p", text: "The Staff Panel sorts every rank into one of five permission tiers. Everything the panel gates is gated on the tier, not on the rank name." },
      { type: "table", head: ["Tier", "Ranks", "Can log", "Also gets"], rows: [
        ["**Moderator**", "Junior Moderator to Chief Moderator", "Warning, kick, BOLO, note", "—"],
        ["**Admin**", "Junior Administrator to Chief Administrator, all four Supervisory ranks, Staff Trainer", "The above plus ban, temp ban, unban", "Run Command, hiding logs"],
        ["**Internal Affairs**", "Trial Internal Affairs to IA Supervisor", "Everything", "Internal Affairs page, strikes that bypass hierarchy, rank change suggestions"],
        ["**Management**", "Management Team to Chief of Staff, Department Owners", "Everything", "HR Panel, LOA review, Account Verification, In-Game Permissions"],
        ["**Director**", "Directors Board to Founder", "Everything", "Director Console, processing resignations, deleting tickets"],
      ]},
      { type: "h3", text: "The three thresholds that matter" },
      { type: "p", text: "Most Discord commands are gated on one of three lines rather than on a rank each. Learn these three and you can predict almost anything." },
      { type: "defs", items: [
        ["Trial Supervisor and above", "Submit rank change requests, issue strikes, review BOLOs, run `/say`, `/giveaway`, `/callstaff`, `/fastpass`, `/endloa`. Also the rank floor for handling ordinary tickets."],
        ["Community Management and above", "Promote and demote instantly, approve or deny rank change requests and LOAs, terminate, start and stop sessions, manage in-game permissions, run `/poll`."],
        ["Director and above", "Process somebody else's resignation, delete a ticket outright, grant alternative verification."],
      ]},
      { type: "note", variant: "open", title: "Known inconsistency", body: "**Ending an LOA** is Trial Supervisor and above in Discord (`/endloa`) but Management and above on the Staff Panel. Until that is settled, treat Management as the real threshold and let Management handle it." },
    ],
  },

  // ------------------------------------------------------------------
  {
    id: "shifts", group: "duty", title: "Shifts and breaks",
    blocks: [
      { type: "p", text: "A shift is the record of you being on duty. It is what your activity is measured against, what grants your in-game powers, and what the rest of the team sees when they check who is available." },
      { type: "h3", text: "Going on duty" },
      { type: "steps", items: [
        "Join the in-game server and join the staff team.",
        "Equip your staff uniform and make sure you are on a blocky avatar.",
        "Start your shift, either with **Start Shift** on the dashboard or with `/shift start`.",
      ]},
      { type: "p", text: "You cannot start a shift while the server is offline or while a shutdown is running; the button says so instead of failing quietly. Starting a shift gives you the On Duty role, adds the on-duty prefix to your nickname, and grants your in-game powers within seconds." },

      { type: "h3", text: "Breaks" },
      { type: "p", text: "A break is the opposite of being on duty, not a pause in the paperwork. While you are on break:" },
      { type: "list", items: [
        "Your On Duty role is swapped for On Break and your prefix changes to match.",
        "Your in-game moderator powers are removed, exactly as if you had clocked off.",
        "You are not counted as available, and off-duty command alerts are not raised against you.",
        "Break time does not count toward your quota.",
      ]},
      { type: "p", text: "Take a break rather than going AFK on duty. Resume from the same button when you come back." },

      { type: "h3", text: "Ending a shift" },
      { type: "p", text: "End your shift with **End Shift** or `/shift stop` when you are done. Your in-game powers are revoked immediately. If the server shuts down while you are still clocked in, your shift is ended for you and the time is saved." },

      { type: "h3", text: "Flagged shifts" },
      { type: "p", text: "The bot watches every open shift and flags one that no longer looks real, then alerts management so a human can look. Two things get flagged:" },
      { type: "list", items: [
        "You are marked on duty but are not actually in the ER:LC server.",
        "You are marked on duty while the server itself is shut down.",
      ]},
      { type: "p", text: "A flag is not a punishment and nothing is ended automatically. Starting a break clears any existing flag, so a break is also how you answer one. If you are flagged repeatedly, expect a conversation." },

      { type: "h3", text: "Off-duty command alerts" },
      { type: "p", text: "Running a moderation command in game while you are not clocked in posts an alert to management, naming you and the command. `:pm` and `:h` are excluded, since neither is a moderation action. Everything else counts." },
      { type: "note", variant: "hard", title: "The rule", body: "If you are moderating, you are on duty. Clock in first. \"I was only doing one thing\" is the exact pattern the alert exists to catch." },
    ],
  },

  // ------------------------------------------------------------------
  {
    id: "ingame-permissions", group: "duty", title: "In-game permissions",
    blocks: [
      { type: "p", text: "Nobody is granted `:mod` or `:admin` permanently. The bot grants your level when you clock in and revokes it when you clock out, and it reconciles continuously so the game's staff list matches who is actually on duty." },
      { type: "h3", text: "Three things are required, all of them" },
      { type: "defs", items: [
        ["Rank", "What you are eligible for, read live from your Discord roles rather than from whatever you were when the shift started."],
        ["Duty", "You are on an open shift right now, and not on a break."],
        ["Identity", "You have verified a Roblox account, so the bot knows which player to run the command on."],
      ]},
      { type: "p", text: "Eligibility on its own grants nothing. A Chief Administrator sitting off duty has exactly as much in-game power as a member of the public." },
      { type: "h3", text: "What each rank is eligible for" },
      { type: "table", head: ["Level", "Ranks"], rows: [
        ["`:admin`", "All Leadership, all Management, all four Supervisory ranks, all four Administration ranks"],
        ["`:mod`", "All four Moderation ranks, Staff Trainer"],
        ["None", "All four Internal Affairs ranks, Department Owners, Staff Team"],
      ]},
      { type: "note", title: "Internal Affairs holds no in-game power", body: "IA is oversight, not a stronger moderator. Your in-game level comes from the strongest *other* rank you hold: an IA member who is also a Junior Moderator gets `:mod`, and one who is also an Administrator gets `:admin`. If Internal Affairs is your only rank, you get nothing in game. This affects `:mod` and `:admin` only; your nickname, your panel access and who you outrank are unchanged." },
      { type: "h3", text: "Server owners" },
      { type: "p", text: "The ER:LC server owner and co-owners sit outside this system entirely. Their power comes from owning the private server and nothing here can grant or take it away." },
      { type: "h3", text: "If your powers do not appear" },
      { type: "p", text: "Management can run `/ingameperms check` on you, which reports exactly which gate is stopping you: not in the Discord, no rank, rank not eligible, on break, not on duty, no verified Roblox account, no confirmed reading from the game server, or the verified account not being in the server. Ask rather than guessing." },
    ],
  },

  // ------------------------------------------------------------------
  {
    id: "activity", group: "duty", title: "Activity and quotas",
    blocks: [
      { type: "h3", text: "The weekly quota" },
      { type: "p", text: "Every staff member is expected to log **4 hours on duty per calendar week**. Progress is on the HR Panel's Quotas tab and resets at the start of each week. Falling short without telling anyone in advance may cost you a strike." },
      { type: "p", text: "Time on break does not count. Time on an approved LOA is not held against you." },

      { type: "h3", text: "Activity checks" },
      { type: "p", text: "Management can post an activity check: a message you have to react to before a deadline. It is a quick test of who is still around, not a trick." },
      { type: "steps", items: [
        "The check is posted with a deadline and every staff member is pinged.",
        "React before the deadline. That is the whole requirement.",
        "When the deadline passes, a list of everyone who missed it goes to Directors for approval, showing what strike number each person would receive.",
        "Directors can add or remove people from that list before approving it. Nothing is issued until somebody approves it.",
      ]},
      { type: "p", text: "Two automatic exemptions apply: anyone on an approved LOA, and anyone who joined the staff team after the check was posted." },
      { type: "note", title: "Missing one is serious", body: "An approved activity check issues real strikes, and for somebody already on two strikes it goes to the third-strike decision. If you know you will be away, file an LOA before the check goes out rather than explaining afterwards." },

      { type: "h3", text: "Weekly performance review" },
      { type: "p", text: "Staff are reviewed weekly, Monday to Sunday, against eight criteria:" },
      { type: "table", head: ["Criterion", "What it covers"], rows: [
        ["Activity", "Time on duty and overall engagement"],
        ["SPaG", "Spelling, punctuation and grammar in staff communication"],
        ["Professionalism", "Attitude, maturity and conduct while representing the team"],
        ["Moderation quality", "Correct use of moderation actions, decision-making, procedure"],
        ["Initiative and teamwork", "Assisting colleagues, volunteering, contributing positively"],
        ["Knowledge of procedures", "Understanding and correctly applying rules and policy"],
        ["Reliability", "Showing up, responding to pings, completing assigned tasks"],
        ["Community interaction", "Being approachable and helpful, not just moderating"],
      ]},
      { type: "p", text: "A review ends one of three ways: promotion, staying put with feedback on what to improve, or demotion where performance is consistently below expectations. Standards rise with rank, and exceptional performance at the lower ranks can skip a rank." },
    ],
  },

  // ------------------------------------------------------------------
  {
    id: "sessions", group: "duty", title: "Sessions: startup and shutdown",
    blocks: [
      { type: "reqs", items: ["Community Management and above"] },
      { type: "h3", text: "Startup" },
      { type: "p", text: "`/startup` announces a session and marks the server online. Until it runs, nobody can clock in. Use `/startup silent` to bring the server up without the public announcement." },
      { type: "h3", text: "Shutdown" },
      { type: "p", text: "`/shutdown` ends the session. The moment it is run, and before the countdown finishes:" },
      { type: "list", items: [
        "Every open shift is ended.",
        "Nobody can start a new shift.",
        "Every staff member's `:mod` and `:admin` is revoked in game.",
      ]},
      { type: "p", text: "None of that waits for the countdown, because the point of a shutdown is that staff powers stop being live. There is a five minute per-person cooldown on successful shutdowns; failed attempts do not cost it." },
      { type: "h3", text: "Calling for staff" },
      { type: "reqs", items: ["Trial Supervisor and above"] },
      { type: "p", text: "`/callstaff` pings the team to get on duty, with an optional reason. It has a **ten minute global cooldown** shared by everyone, so use it when coverage is genuinely short rather than as a nudge." },
      { type: "h3", text: "Population alerts" },
      { type: "p", text: "The bot watches the server population and pings management when it drops below a threshold, but only after the server has been busy enough that a drop means something. This is automatic and needs nothing from you; it is why management sometimes appears without being asked." },
    ],
  },

  // ------------------------------------------------------------------
  {
    id: "punishments", group: "moderation", title: "Punishment guide",
    blocks: [
      { type: "note", variant: "hard", title: "Evidence first", body: "You must have a clip or have witnessed the offence firsthand before issuing any punishment. Somebody else's word is a reason to investigate, not a reason to act." },
      { type: "h3", text: "Minor offences — warning" },
      { type: "list", items: [
        "Spamming moderator calls",
        "Minor New Life Rule violations",
        "Misuse of Booster or VIP perks",
      ]},
      { type: "h3", text: "Moderate offences — kick" },
      { type: "list", items: [
        "Fail Roleplay (FRP)",
        "Random Deathmatch and Vehicle Deathmatch (RDM/VDM)",
        "Auto jail",
        "Disrespect toward staff",
        "GTA driving: unrealistic or reckless driving",
      ]},
      { type: "note", title: "RDM and VDM go straight to a kick", body: "Do not issue three warnings first. Server chaos and roleplay quality are ongoing complaints and this is the response to them." },
      { type: "h3", text: "Severe offences — ban" },
      { type: "list", items: [
        "Exploiting",
        "Cheating",
        "Harassment",
        "Hate speech",
        "Mass RDM/VDM",
        "Ban evasion",
        "Staff impersonation",
      ]},
      { type: "h3", text: "Kick rejoin cooldown" },
      { type: "p", text: "Logging a kick on the Staff Panel can start a rejoin cooldown, and anyone who comes back inside their window is re-kicked automatically. The cooldown is only ever created by the panel log, never by the `:kick` command itself, which is another reason to log every kick. Active cooldowns are listed on the Internal Affairs page." },
    ],
  },

  // ------------------------------------------------------------------
  {
    id: "modcalls", group: "moderation", title: "Handling mod calls",
    blocks: [
      { type: "steps", items: [
        "Respond promptly. **Two to three staff per call, maximum.** More than that is a crowd, not a response.",
        "Listen to the caller's report calmly and in full.",
        "Gather every side of the story before deciding anything.",
        "Review the evidence: clips, screenshots, what you saw yourself.",
        "Decide the punishment using the punishment guide.",
        "Explain the punishment clearly to the player *before* you issue it.",
        "Log it on the Staff Panel immediately. No exceptions.",
      ]},
      { type: "h3", text: "Rules for how you handle it" },
      { type: "list", items: [
        "Do not take sides and do not show favouritism.",
        "Do not handle a situation involving your friends if you can avoid it. Hand it to another staff member.",
        "If it escalates beyond your rank, call in a higher-up rather than improvising.",
        "Do not interfere with active RP unless the violation is serious enough to need immediate action.",
        "When you are unsure what the right punishment is, ask before acting. Asking is always cheaper than being wrong.",
      ]},
      { type: "h3", text: "Staff roleplay policy" },
      { type: "p", text: "You may stay on duty while roleplaying while the server is **below 20 players**, and you are still expected to respond to reports during that time." },
      { type: "p", text: "Once the server hits 20 players, choose one: keep roleplaying and go off duty, or stop roleplaying and stay on duty to moderate. Use your own judgement about whether more coverage is needed, and expect management to ask you to stay on or come back when it is." },
    ],
  },

  // ------------------------------------------------------------------
  {
    id: "logging", group: "moderation", title: "Logging punishments",
    blocks: [
      { type: "note", variant: "hard", title: "If it is not logged, it did not happen", body: "Every warning, kick and ban goes into the Staff Panel immediately after you issue it. An unlogged punishment is an undocumented one, it cannot be appealed fairly, and it will be treated as an unlogged action against you." },
      { type: "h3", text: "How" },
      { type: "steps", items: [
        "Open the dashboard.",
        "Use **Create New Log**.",
        "Pick the log type, enter the player's Roblox username and the reason, and submit. The username field suggests players as you type.",
      ]},
      { type: "p", text: "A temp ban also requires an unban date. The type list is filtered to what your rank is allowed to issue, so if a type is missing you do not have it." },
      { type: "h3", text: "Log types" },
      { type: "table", head: ["Type", "Who can issue", "Notes"], rows: [
        ["Warning", "Everyone", "—"],
        ["Kick", "Everyone", "May start a rejoin cooldown"],
        ["Note", "Everyone", "Record without a punishment"],
        ["BOLO", "Everyone", "A ban request for review, not a ban"],
        ["Ban", "Admin tier and above", "—"],
        ["Temp ban", "Admin tier and above", "Requires an unban date"],
        ["Unban", "Admin tier and above", "Reversing a ban is the same authority as issuing one"],
      ]},
      { type: "h3", text: "Ban BOLOs" },
      { type: "p", text: "A BOLO is how a Moderator gets a ban issued without having ban powers. You log a BOLO with the reason and the evidence; it goes into a review queue as pending." },
      { type: "reqs", items: ["Trial Supervisor and above to review"] },
      { type: "p", text: "Reviewers accept or decline from either Discord (`/bolo`) or the Staff Panel. Both act on the same record, so a decision on one side appears immediately on the other. An accepted BOLO issues the ban in game." },
      { type: "h3", text: "Hiding a log" },
      { type: "reqs", items: ["Admin tier and above"] },
      { type: "p", text: "A log can be hidden from public view when it contains something that should not be public. Hiding is recorded; it is not deletion and it is not a way to make a mistake disappear." },
      { type: "h3", text: "Run Command" },
      { type: "reqs", items: ["Management and above"] },
      { type: "p", text: "The dashboard's **Run Command** sends a raw command straight to the ER:LC server. There is no allowlist and no confirmation step, and every use is recorded against your name in the audit log." },
      { type: "note", variant: "hard", title: "Treat this as live fire", body: "A mistyped bulk command here affects everybody in the server at once and can trip the anti-abuse system. Read what you typed before you send it." },
    ],
  },

  // ------------------------------------------------------------------
  {
    id: "commands-ingame", group: "moderation", title: "In-game commands",
    blocks: [
      { type: "h3", text: "Command standards" },
      { type: "defs", items: [
        ["Full commands only", "Use the full four-or-more-letter form. `:kick`, not a shorthand."],
        ["Full usernames only", "`:kick Bob1234 RDM` is correct. `:kick Bob RDM` is not, and can hit the wrong player."],
      ]},
      { type: "p", text: "Breaking either is a verbal warning first, then a strike." },
      { type: "h3", text: "The three message commands" },
      { type: "table", head: ["Command", "What it does", "Use for"], rows: [
        ["`:h`", "Hint, stays on screen", "Standing rules and situational notices that apply for a while"],
        ["`:m`", "Server message, scrolls away", "One-off announcements: an opening, a shutdown"],
        ["`:pm`", "Private message to one player", "Moderation messages to an individual"],
      ]},
      { type: "p", text: "Do not write your own when an approved message exists." },
      { type: "h3", text: "Roblox will filter you" },
      { type: "p", text: "Everything you send goes through Roblox's chat filter and anything it dislikes arrives as `###`. Numbers are the main trigger. Keep messages short, avoid digits, and use plain words; nothing that looks like an attempt to sneak past a filter, because that is exactly what the filter looks for." },
    ],
  },

  // ------------------------------------------------------------------
  {
    id: "announcements", group: "moderation", title: "In-game announcements",
    blocks: [
      { type: "p", text: "The In-Game Announcements channel carries a panel with every approved reusable message, sorted into six categories. Pick a category, pick the message, and copy the line it gives you straight into the game. The line comes with the right prefix already on it." },
      { type: "table", head: ["Category", "Prefix", "Covers"], rows: [
        ["Business & Location", "`:m`", "Openings, services, locations"],
        ["Department & Recruitment", "`:h`", "Hiring, applications, whitelists"],
        ["Rules & Reminders", "`:h`", "Standing rules and in-game conduct"],
        ["Server & Community", "`:m` `:h`", "Comms, shutdowns, community notices"],
        ["Active RP / Situations", "`:h`", "Temporary situational announcements"],
        ["Moderation Messages", "`:pm`", "Private messages to one player"],
      ]},
      { type: "p", text: "Anything in square brackets is yours to fill in before you send it: `[user]`, `[location]`, `[postal]`, `[reason]`, `[department]`." },
      { type: "p", text: "Management can edit the list from the HR Panel and changes reach the Discord panel on their own within about fifteen seconds. If a message is worded badly or missing, say so rather than improvising your own version." },
      { type: "note", title: "Do not free-hand announcements", body: "The approved wording exists so the same announcement reads the same way every time and does not get filtered. Write your own only for something genuinely one-off." },
    ],
  },

  // ------------------------------------------------------------------
  {
    id: "vip-vehicles", group: "moderation", title: "VIP vehicles",
    blocks: [
      { type: "p", text: "Some vehicles are restricted to VIP and Booster members. The bot watches the live vehicle list, and when somebody without VIP is driving one it alerts staff and sends the player an in-game PM asking them to change vehicle." },
      { type: "p", text: "The bot never kicks, bans or punishes for this. Enforcement is yours:" },
      { type: "steps", items: [
        "The alert tells you who and what. Confirm it yourself before acting.",
        "Ask them to change vehicle, using the approved VIP vehicle PM from the announcements panel.",
        "If they refuse, treat it as misuse of VIP perks: a warning, escalating if they keep at it.",
      ]},
      { type: "p", text: "VIP status is checked live every cycle, so somebody who just bought VIP stops being flagged straight away. If you think an alert is wrong, check their roles before you act on it." },
    ],
  },

  // ------------------------------------------------------------------
  {
    id: "rplogs", group: "moderation", title: "RP permission logs",
    blocks: [
      { type: "p", text: "Any roleplay that needs staff permission gets logged with `/rplog`. That is the whole system; do not type it into the channel by hand." },
      { type: "p", text: "The command asks for the Roblox username of whoever asked, the RP type from a fixed list, the location, how long it runs, and any notes. The fixed list is the point: the old free-text logs produced ninety-five different spellings of about a dozen RP types, which made them unsearchable." },
      { type: "list", items: [
        "Put the **Roblox username** in the Roblox field. Not a Discord mention.",
        "Put the location in the **location** field, not inside the RP type.",
        "Use **Other** only when nothing in the list fits, and type a plain description.",
      ]},
      { type: "p", text: "The type list is editable by management, so if something is genuinely missing it can be added without a code change. Ask rather than filing everything under Other." },
    ],
  },

  // ------------------------------------------------------------------
  {
    id: "discord-moderation", group: "moderation", title: "Discord moderation",
    blocks: [
      { type: "h3", text: "Automod" },
      { type: "p", text: "Automod runs on every message from a non-staff member and handles the obvious cases so you do not have to. Staff and trusted roles are exempt before any check runs. It catches:" },
      { type: "list", items: [
        "Slurs and hate speech, and profanity",
        "Mass mentions",
        "Unauthorised invite links and unauthorised links",
        "Keyboard and repeated-character spam, emoji spam",
        "Excessively long messages and markdown abuse",
        "Repeated messages and message frequency",
        "New accounts joining during raid mode",
      ]},
      { type: "p", text: "Repeat offences climb a ladder: warn, then a ten minute timeout, then an hour, then a kick, then a ban. Thresholds are deliberately lax rather than hair-trigger. Offences are visible on the HR Panel's Automod Offenses tab." },
      { type: "p", text: "Do not manually punish something automod already handled, and do not undo an automod action without checking why it fired." },
      { type: "h3", text: "Manual Discord moderation" },
      { type: "p", text: "Ordinary Discord moderation follows the same principles as in game: evidence first, explain it, be consistent. Discord conduct reports come in through General Support tickets." },
      { type: "h3", text: "Suggestions and polls" },
      { type: "p", text: "Anyone with the right role can post a suggestion with `/suggest`, subject to a cooldown. Discussion threads can be opened on a suggestion by the roles configured for it. `/poll create` is Community Management and above." },
    ],
  },

  // ------------------------------------------------------------------
  {
    id: "tickets", group: "support", title: "Tickets",
    blocks: [
      { type: "p", text: "There are five ticket types and they do not share an audience. A member can only have one ticket open at a time." },
      { type: "table", head: ["Type", "For", "Who can see and claim it"], rows: [
        ["**General Support**", "Questions, minor concerns, Discord conduct reports", "Support Staff, or Trial Supervisor and above"],
        ["**Community Related**", "Shop items, giveaway prizes, event invitations", "Support Staff, or Trial Supervisor and above"],
        ["**Fast Pass**", "Applying to the Fast Pass / Staff Transfer Programme", "Internal Affairs, Management and Directors"],
        ["**Staff Complaint**", "Reporting a staff member", "Internal Affairs, Management and Directors"],
        ["**Ban Appeal**", "Appealing a ban", "Admin and above who are *also* Support Staff"],
      ]},
      { type: "note", variant: "open", title: "Known inconsistency", body: "**Fast Pass tickets** can currently be claimed by Trial Supervisor and above, but only Internal Affairs, Management and Directors can see them. A Supervisor may find they can claim a ticket that never appears for them. Leave Fast Pass tickets to IA until this is settled." },
      { type: "h3", text: "Claiming" },
      { type: "p", text: "Claim a ticket before you work it, so two people are not answering the same person. On most types, claiming narrows the channel to you and the opener. Staff Complaints and Ban Appeals keep the whole qualifying team in, because those are reviewed by a team rather than owned by whoever got there first." },
      { type: "p", text: "Every action re-checks your live Discord roles. Being in the channel is not what decides whether you can act." },
      { type: "h3", text: "Closing" },
      { type: "defs", items: [
        ["`/tclosereq`", "Asks the opener to confirm their issue is resolved, with an optional auto-close after a set number of hours. Use this by default."],
        ["`/tclose`", "Closes it directly, asking you for a reason and a confirmation. Use when the opener has gone quiet or the ticket is clearly finished."],
        ["`/tdelete`", "Director and above. Deletes the ticket outright. Not the normal path."],
      ]},
      { type: "p", text: "Closing archives a full transcript, including every attachment, to the Staff Panel before the channel is deleted. Transcripts survive the channel, the attachments, and the opener leaving the server, and are readable from the Ticket Transcripts page." },
      { type: "h3", text: "Managing a ticket" },
      { type: "reqs", items: ["Director and above"] },
      { type: "p", text: "`/trename`, `/tadd`, `/tremove`, `/texclude` and `/ttranscript` handle the edge cases: renaming a ticket, pulling somebody in or out, and fetching a transcript." },
      { type: "note", variant: "hard", title: "Staff-only information", body: "Internal notes, moderation history and anything from a Staff Complaint stay inside the staff-only channels they were written in. Do not paste them into a ticket the reported person can read, and do not discuss an open complaint with its subject." },
    ],
  },

  // ------------------------------------------------------------------
  {
    id: "ban-appeals", group: "support", title: "Ban appeals",
    blocks: [
      { type: "p", text: "Appeals are handled here, in the main server, as a ticket type. There is no separate appeal server any more." },
      { type: "reqs", items: ["Admin tier and above", "and Support Staff"] },
      { type: "p", text: "Both are required. Being Admin+ alone does not qualify you, and holding Support Staff alone does not either." },
      { type: "h3", text: "How an appeal arrives" },
      { type: "steps", items: [
        "The player presses the button on the ban appeals channel and fills in a short form.",
        "The bot resolves their identity from the Discord account that submitted it. Nobody can appeal as somebody else.",
        "It resolves their Roblox account where it can and looks up the bans on record for them. An unknown Roblox ID does not block the appeal.",
        "The ticket opens with the submitted details and any related bans laid out for you.",
      ]},
      { type: "h3", text: "Handling one" },
      { type: "list", items: [
        "Read the ban record before you read the appeal. The record is the fact; the appeal is the argument.",
        "Appeals are reviewed by the team, not owned by the claimer. A second opinion on a ban is normal.",
        "Do not discuss an appeal outside the ticket.",
        "Repeat appeals for the same ban are limited by a re-appeal window. Point them at it rather than reopening.",
      ]},
    ],
  },

  // ------------------------------------------------------------------
  {
    id: "strikes", group: "record", title: "Strikes",
    blocks: [
      { type: "reqs", items: ["Trial Supervisor and above to issue"] },
      { type: "h3", text: "How they expire" },
      { type: "note", title: "Each strike expires on its own clock", body: "A strike is active for **14 days from the day it was issued**, then it clears itself. A new strike does *not* reset the older ones. If you receive strike 1 on the 1st and strike 2 on the 10th, the first clears on the 15th and the second on the 24th, independently." },
      { type: "p", text: "Strikes are held in three numbered slots and you are given the lowest free slot, not \"your count plus one\". If slot 1 expired while slot 2 is still active, your next strike is slot 1 again." },
      { type: "h3", text: "Three active strikes" },
      { type: "p", text: "Reaching three *simultaneously active* strikes triggers a decision card sent to Community Management and above. There are two outcomes and somebody has to choose one:" },
      { type: "defs", items: [
        ["Terminate", "Removed from the staff team."],
        ["Demote", "Dropped to a lower rank, chosen from the normal rank picker."],
      ]},
      { type: "p", text: "Nothing happens automatically at three strikes. A human decides." },
      { type: "h3", text: "Getting one removed" },
      { type: "p", text: "`/unstrike` removes a strike early, at Community Management and above. If you believe a strike was issued in error, take it to management or Internal Affairs with your reasoning; do not argue it with the person who issued it in a public channel." },
    ],
  },

  // ------------------------------------------------------------------
  {
    id: "loa", group: "record", title: "Leave of absence",
    blocks: [
      { type: "p", text: "An LOA is how you stay on the team while you are away. File one *before* you go quiet, not after somebody notices." },
      { type: "h3", text: "Filing one" },
      { type: "p", text: "Use `/loa` in Discord or **Manage LOA** on the dashboard. You give a reason, a start date and an end date. The request goes to management for a decision." },
      { type: "h3", text: "Approval" },
      { type: "reqs", items: ["Community Management and above"] },
      { type: "p", text: "Approved or denied from either Discord or the panel; both act on the same request. On approval you get the LOA role and your nickname prefix changes to match. The role is removed automatically when your LOA ends." },
      { type: "h3", text: "While you are on LOA" },
      { type: "list", items: [
        "You are exempt from activity checks.",
        "You are not expected to meet the weekly quota.",
        "You can still clock in if you want to; an LOA excuses you, it does not lock you out.",
      ]},
      { type: "h3", text: "Ending early or extending" },
      { type: "p", text: "Management can end an LOA early or extend it from the HR Panel. `/endloa` does the same in Discord. If your plans change, say so rather than letting it run." },
    ],
  },

  // ------------------------------------------------------------------
  {
    id: "rank-changes", group: "record", title: "Promotions and demotions",
    blocks: [
      { type: "h3", text: "Two routes" },
      { type: "defs", items: [
        ["Request", "Trial Supervisor and above submit a promotion or demotion for approval. The request expires after 24 hours if nobody acts on it."],
        ["Instant", "Community Management and above apply a rank change immediately, with no approval step."],
      ]},
      { type: "p", text: "Internal Affairs can suggest a rank change from the Internal Affairs page. A suggestion is not a decision; it goes to the same approval queue." },
      { type: "h3", text: "What happens on a rank change" },
      { type: "list", items: [
        "Your rank roles and team role are replaced in a single operation, so you never end up holding two ranks.",
        "Your nickname prefix is updated.",
        "Your in-game permissions are re-evaluated immediately.",
        "Your Staff Panel session is invalidated, so an already-open tab cannot keep your old access.",
      ]},
      { type: "p", text: "Pinned roles (Support Staff, Staff Trainer, Application Reviewer) are kept through a rank change. They describe a job, not a level." },
      { type: "h3", text: "How promotions are decided" },
      { type: "p", text: "Through the weekly review. Standards rise with rank, and exceptional performance at the lower ranks can skip a rank. Do not ask for a promotion; the review is the mechanism." },
    ],
  },

  // ------------------------------------------------------------------
  {
    id: "training", group: "record", title: "Training and Fast Pass",
    blocks: [
      { type: "h3", text: "Fast Pass" },
      { type: "p", text: "Fast Pass is the transfer route for people with real moderation experience elsewhere. They apply through a Fast Pass ticket with proof of their experience, and Internal Affairs reviews it." },
      { type: "steps", items: [
        "**`/fastpass`** (Trial Supervisor and above) approves the applicant. They get the Awaiting Training role and nothing else: no staff roles, no trial clock.",
        "A Staff Trainer runs their training.",
        "**`/passtraining`** onboards them as a Junior Moderator and starts a **7 day trial** from that moment. **`/failtraining`** ends it instead.",
        "When the 7 days are up, a decision card goes out: confirm them or remove them, handled like any other promotion decision.",
      ]},
      { type: "p", text: "A trial ends early on its own if the person leaves the server, is terminated, or has their rank changed." },
      { type: "h3", text: "Trainers" },
      { type: "reqs", items: ["Staff Trainer"] },
      { type: "p", text: "Both `/passtraining` and `/failtraining` take up to three trainers, so a session run by more than one person is credited to all of them. Add notes; they are part of the record and they are what a review reads later." },
      { type: "p", text: "Staff Trainer is a pinned role, kept through promotions and demotions, and it carries Admin-tier panel access and `:mod` in game so a trainer can demonstrate the tools they teach." },
    ],
  },

  // ------------------------------------------------------------------
  {
    id: "leaving", group: "record", title: "Leaving the team",
    blocks: [
      { type: "h3", text: "Resigning" },
      { type: "p", text: "You can resign yourself at any time from the **Resign** action on the dashboard. Processing somebody else's resignation is Director and above, in Discord with `/resign` or from the HR Panel." },
      { type: "h3", text: "Termination" },
      { type: "reqs", items: ["Community Management and above"] },
      { type: "p", text: "`/terminate` removes somebody from the staff team with a reason. It is also the outcome of a third-strike decision, an approved activity check, and the automatic anti-abuse response." },
      { type: "h3", text: "What removal does" },
      { type: "list", items: [
        "Every staff role is stripped and the Former Staff role is applied.",
        "Any open shift is ended and in-game powers are revoked.",
        "Any Fast Pass trial in progress ends.",
        "The Staff Panel session is invalidated immediately, so an open tab loses access at once rather than lasting out its twelve hours.",
        "The removal is recorded with who did it and why.",
      ]},
    ],
  },

  // ------------------------------------------------------------------
  {
    id: "internal-affairs", group: "oversight", title: "Internal Affairs",
    blocks: [
      { type: "p", text: "Internal Affairs investigates the staff team. It is a separate tier from the promotion ladder, and a member of IA usually holds a moderation or administration rank alongside it." },
      { type: "h3", text: "What IA has" },
      { type: "list", items: [
        "The **Internal Affairs** page on the Staff Panel.",
        "Sole access, with Management and Directors, to **Staff Complaint** and **Fast Pass** tickets.",
        "Issuing strikes, including on staff who would otherwise outrank them.",
        "Suggesting promotions and demotions.",
        "Requesting staff coverage.",
        "Visibility of active kick rejoin cooldowns.",
      ]},
      { type: "h3", text: "What IA does not have" },
      { type: "note", title: "No in-game power from the IA rank", body: "Internal Affairs grants no `:mod` or `:admin`. If an IA member also holds a moderation rank, that rank is what decides their in-game level. IA is oversight, not a stronger moderator." },
      { type: "h3", text: "Reporting a staff member" },
      { type: "p", text: "Open a **Staff Complaint** ticket. It is visible only to Internal Affairs, Management and Directors, and the person you are reporting cannot see it. Bring evidence: clips, screenshots, message links, timestamps." },
      { type: "p", text: "Do not report staff misconduct in a public channel, do not confront the person yourself, and do not discuss an open complaint with its subject." },
      { type: "note", variant: "open", title: "Pending confirmation", body: "The investigation procedure itself — who is assigned, what the standard of proof is, whether the subject is interviewed, and how the outcome is communicated — is not defined anywhere in the system and needs to be written down by IA leadership." },
    ],
  },

  // ------------------------------------------------------------------
  {
    id: "management", group: "oversight", title: "Management",
    blocks: [
      { type: "p", text: "Management runs the day to day. On top of everything below their tier, Management and above hold:" },
      { type: "list", items: [
        "**HR Panel**: strikes, LOAs, promotions and demotions, terminations, resignations, quotas, automod offences, in-game announcements.",
        "**Account Verification**: resolving verification problems.",
        "**In-Game Permissions**: checking why somebody's powers are not applying, and revoking everyone's at once if needed.",
        "**Run Command** on the dashboard.",
        "Sessions: `/startup` and `/shutdown`.",
        "Activity checks, and approving the strikes that come out of them.",
      ]},
      { type: "h3", text: "Standing responsibilities" },
      { type: "list", items: [
        "Keep coverage adequate. Ask staff to stay on or come back when the server needs it.",
        "Act on flagged shifts and off-duty command alerts rather than letting them stack up.",
        "Run the weekly review and act on it, in both directions.",
        "Answer escalations promptly. Staff are told to ask rather than guess, which only works if asking gets an answer.",
        "Respond to anti-abuse and Discord security alerts immediately. Those are the ones that cannot wait.",
      ]},
      { type: "h3", text: "Directors" },
      { type: "p", text: "Directors additionally hold the **Director Console** (hub content, alternative verification grants, the full audit log), process resignations, and delete tickets. Directors approve the strike list that comes out of an activity check." },
    ],
  },

  // ------------------------------------------------------------------
  {
    id: "safeguards", group: "oversight", title: "Automatic safeguards",
    blocks: [
      { type: "p", text: "Two systems watch for a compromised or abusive staff account. You should know they exist, what sets them off, and that neither is something to test." },
      { type: "h3", text: "Anti-mod-abuse (in game)" },
      { type: "p", text: "Watches for dangerous bulk-target commands: `:kick all`, `:bring others`, a long explicit player list. Once confirmed, it revokes in-game powers, game-bans, terminates on Discord, strips roles and logs everything." },
      { type: "note", variant: "hard", title: "This will fire on an accident", body: "It does not know whether you meant it. It deliberately does *not* ban you from Discord, so management can reach you and review what happened, but everything else is automatic. Do not run a bulk-target command unless you are certain." },
      { type: "h3", text: "Discord moderation security" },
      { type: "p", text: "Watches Discord's own audit log for bursts of bans, kicks, timeouts, role changes, channel deletions and permission changes. A burst raises a flag at one of three severities and alerts management." },
      { type: "p", text: "Thresholds are set so ordinary moderation never trips them: a handful of normal bans or kicks is not a burst. It never automatically kicks or bans the moderator it flagged. `/modsecurity restore` (Management Team and above) reverses an automatic response." },
      { type: "h3", text: "The audit log" },
      { type: "p", text: "Staff actions are recorded: rank changes, strikes, terminations, LOA decisions, ticket actions, commands run, permission grants and revocations, verification changes. Assume everything you do as staff is attributable to you, because it is." },
    ],
  },

  // ------------------------------------------------------------------
  {
    id: "conduct", group: "oversight", title: "Conduct and accountability",
    blocks: [
      { type: "h3", text: "Do" },
      { type: "list", items: [
        "Stay professional and calm, in every situation and every channel.",
        "Explain punishments clearly before issuing them.",
        "Use full commands and full usernames, every time.",
        "Ask when you are unsure. It is always the right call.",
        "Treat every player the same regardless of who they are.",
        "Log and document everything significant.",
        "Report staff misconduct through a Staff Complaint ticket.",
      ]},
      { type: "h3", text: "Do not" },
      { type: "list", items: [
        "Abuse staff commands or powers.",
        "Show favouritism toward friends or particular players.",
        "Handle situations involving your friends if it can be avoided.",
        "Act outside your authority instead of escalating.",
        "Go AFK on duty. Take a break or clock off.",
        "Moderate off duty. Clock in first.",
        "Engage in drama, arguments or toxicity anywhere.",
        "Discuss internal staff matters outside staff channels.",
      ]},
      { type: "h3", text: "Accountability" },
      { type: "p", text: "Staff are held to a higher standard than players, not a lower one. Your actions are logged, your shifts are tracked, and your rank is reviewed weekly. Being staff is not protection from consequences; it is the reason there are more of them." },
      { type: "p", text: "If you disagree with something in this handbook or with a decision made about you, raise it with management or Internal Affairs directly. Do not argue it in public channels." },
    ],
  },

  // ------------------------------------------------------------------
  {
    id: "panel", group: "reference", title: "The Staff Panel",
    blocks: [
      { type: "p", text: "Sign in with Discord. You are asked to confirm your linked Roblox account the first time; that confirmation is checked on every request afterwards, not just at sign-in." },
      { type: "table", head: ["Page", "Who sees it", "What it holds"], rows: [
        ["**Dashboard**", "Everyone", "Shift controls, who is on duty, live player list, Create New Log, punishment logs, player lookup, LOA, leaderboard, shift history, resign. Run Command and Request Staff appear for those who have them."],
        ["**Internal Affairs**", "IA, Management, Directors", "Issue a strike, suggest a rank change, active kick rejoin cooldowns"],
        ["**HR Panel**", "Management, Directors", "Pending rank changes and LOAs, issue strikes, promote and demote, terminate, resignations, automod offences, quotas, in-game announcements"],
        ["**Account Verification**", "Management and above", "Resolving verification problems"],
        ["**In-Game Permissions**", "Management and above", "Status, per-person checks, revoke everyone"],
        ["**Director Console**", "Directors", "Department and Civilian hub content, alternative verification grants, full audit log"],
        ["**Ticket Transcripts**", "Support Staff; IA and above see Staff Complaints", "Archived transcripts with attachments"],
        ["**Handbook**", "Everyone", "This document, at `/staff-handbook`. Deliberately not in the sidebar; reach it by the link."],
        ["**Changelog**", "Everyone", "What changed and when"],
      ]},
      { type: "p", text: "Panel and Discord act on the same records. A strike issued in Discord appears on the panel instantly and the reverse is also true; there is no syncing and no second copy." },
    ],
  },

  // ------------------------------------------------------------------
  {
    id: "command-reference", group: "reference", title: "Command reference",
    blocks: [
      { type: "p", text: "Discord slash commands relevant to staff work. Player-facing commands (economy, casino, business, banking, stocks, insurance, property, crime) are not listed; they are not staff duties." },
      { type: "table", head: ["Command", "Minimum rank", "What it does"], rows: [
        { tier: "Duty" },
        ["`/shift start` `stop` `leaderboard`", "Staff Team", "Manage your own shift"],
        ["`/callstaff`", "Trial Supervisor", "Ask staff to get on duty. 10 min global cooldown"],
        ["`/startup`", "Community Management", "Start a session"],
        ["`/shutdown`", "Community Management", "End a session. 5 min personal cooldown"],
        ["`/players` `/population` `/status`", "Staff Team", "Live server information"],
        { tier: "Moderation" },
        ["`/bolo`", "Trial Supervisor", "Review the ban BOLO queue"],
        ["`/rplog`", "Staff Team", "Log an RP permission"],
        ["`/ingameperms status` `check` `revokeall`", "Community Management", "Inspect and control in-game permissions"],
        ["`/modsecurity restore`", "Management Team", "Reverse an automatic security response"],
        { tier: "Staff record" },
        ["`/strike`", "Trial Supervisor", "Issue a strike"],
        ["`/unstrike`", "Community Management", "Remove a strike early"],
        ["`/loa`", "Staff Team", "File a leave of absence"],
        ["`/endloa`", "Trial Supervisor", "End somebody's LOA early"],
        ["`/promote` `/demote`", "Trial Supervisor to request, Community Management to apply", "Change somebody's rank"],
        ["`/terminate`", "Community Management", "Remove somebody from staff"],
        ["`/resign`", "Director", "Process somebody's resignation"],
        ["`/activitycheck start`", "Community Management", "Post an activity check"],
        { tier: "Training" },
        ["`/fastpass`", "Trial Supervisor", "Approve a Fast Pass applicant"],
        ["`/passtraining`", "Staff Trainer", "Pass a trainee and start their trial"],
        ["`/failtraining`", "Staff Trainer", "Fail a trainee"],
        { tier: "Tickets" },
        ["`/tclosereq`", "Ticket handler", "Ask the opener to confirm it is resolved"],
        ["`/tclose`", "Ticket handler", "Close the ticket"],
        ["`/tdelete` `/trename` `/tadd` `/tremove` `/texclude` `/ttranscript`", "Director", "Ticket management"],
        { tier: "Utility" },
        ["`/myid`", "Anyone", "Your Discord ID"],
        ["`/fixnick`", "Junior Supervisor", "Re-apply somebody's nickname"],
        ["`/feedback`", "Anyone", "Rate a staff member who helped you"],
        ["`/suggest`", "Configured roles", "Post a suggestion"],
        ["`/say`", "Trial Supervisor", "Send a message as the bot"],
        ["`/poll create` `close`", "Community Management", "Run a poll"],
        ["`/giveaway create`", "Trial Supervisor", "Run a giveaway"],
        ["`/playtime`", "Staff Team; reset is Community Management", "Department playtime"],
      ]},
    ],
  },

  // ------------------------------------------------------------------
  {
    id: "numbers", group: "reference", title: "Numbers at a glance",
    blocks: [
      { type: "table", head: ["Thing", "Value"], rows: [
        ["Weekly on-duty quota", "4 hours per calendar week"],
        ["Strike duration", "14 days, each strike independently"],
        ["Strikes before a decision", "3 active at once"],
        ["Fast Pass trial", "7 days from passing training"],
        ["Rank change request expiry", "24 hours"],
        ["Confirmation prompt timeout", "10 minutes"],
        ["Staff RP threshold", "20 players"],
        ["Staff per mod call", "2 to 3 maximum"],
        ["`/callstaff` cooldown", "10 minutes, shared by everyone"],
        ["`/shutdown` cooldown", "5 minutes, per person"],
        ["Panel session length", "12 hours, revoked instantly on a rank change"],
        ["Announcement edits reaching Discord", "About 15 seconds"],
      ]},
    ],
  },
];

/**
 * One lowercase text blob per section, for the filter. Built once at
 * module load rather than per keystroke, and from the data rather than
 * from the DOM so it cannot go stale against what is rendered.
 */
export const HANDBOOK_SEARCH_TEXT = HANDBOOK.reduce((acc, section) => {
  const parts = [section.title];
  for (const b of section.blocks) {
    if (b.text) parts.push(b.text);
    if (b.title) parts.push(b.title);
    if (b.body) parts.push(b.body);
    if (b.items) {
      for (const item of b.items) parts.push(Array.isArray(item) ? item.join(" ") : item);
    }
    if (b.head) parts.push(b.head.join(" "));
    if (b.rows) {
      for (const r of b.rows) parts.push(Array.isArray(r) ? r.join(" ") : (r.tier ?? ""));
    }
  }
  acc[section.id] = parts.join(" ").toLowerCase();
  return acc;
}, {});

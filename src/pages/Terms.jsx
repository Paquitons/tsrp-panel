import LegalPage, { LegalSection } from "./LegalPage";

// ==================================================================
// Terms of Service
//
// Deliberately short and plain. The detailed conduct rules live in
// Discord and are the ones actually enforced; this says how the site
// and the panel may be used, and points at those rules rather than
// duplicating them where the two could drift apart.
// ==================================================================
export default function Terms() {
  return (
    <LegalPage
      title="Terms of Service"
      intro="The rules for using the Texas State RP website, staff panel and Discord bot."
    >
      <LegalSection heading="Using this site">
        <p>
          By using this website, our staff panel or our Discord bot, you
          agree to what is written here. If you do not, please do not use
          them.
        </p>
        <p>
          Texas State RP is a community roleplay server. We are not
          affiliated with, endorsed by, or run by Roblox Corporation or
          Discord.
        </p>
      </LegalSection>

      <LegalSection heading="Our community rules come first">
        <p>
          Playing on our server and taking part in our Discord is covered
          by our published community rules, which are in our Discord server
          and are the ones our staff enforce. Nothing on this page replaces
          them.
        </p>
        <p>
          You are also bound by the Roblox Terms of Use and the Discord
          Terms of Service on their own platforms. We cannot grant you
          anything that those do not allow.
        </p>
      </LegalSection>

      <LegalSection heading="The staff panel">
        <p>
          The staff panel is for our staff team only. If you have access to
          it:
        </p>
        <ul>
          <li>Your access is yours alone. Do not share your login, and do not let anybody else use your account.</li>
          <li>Confirm your linked Roblox account honestly when asked. Verifying as an account that is not yours is treated as a serious breach.</li>
          <li>Use moderation powers only while on duty and only within your rank.</li>
          <li>Information you see in the panel about players and other staff stays inside the staff team.</li>
        </ul>
        <p>
          Access can be removed at any time, most obviously when somebody
          leaves the staff team.
        </p>
      </LegalSection>

      <LegalSection heading="Things you may not do">
        <ul>
          <li>Break into, probe or interfere with our site, panel, bot or game server</li>
          <li>Use somebody else's account, or pretend to be somebody you are not</li>
          <li>Scrape or bulk collect information from our site</li>
          <li>Use anything here to harass, threaten or endanger another person</li>
        </ul>
      </LegalSection>

      <LegalSection heading="Moderation decisions">
        <p>
          We may warn, kick, ban or remove access when our rules are
          broken, and we may do so without notice when a situation calls
          for it. Appeals go through a ticket in our Discord server, which
          is the only place we handle them.
        </p>
      </LegalSection>

      <LegalSection heading="No guarantees">
        <p>
          Everything here is provided as it is. We run this community in
          our own time, and we cannot promise the site, the panel, the bot
          or the game server will be available, correct or uninterrupted.
          In-game items, currency, ranks and progress have no real world
          value and can change or be reset.
        </p>
      </LegalSection>

      <LegalSection heading="Changes">
        <p>
          If these terms change in a way that matters, we will say so in
          our Discord server. Continuing to use the site afterwards means
          you accept the change.
        </p>
      </LegalSection>

      <LegalSection heading="Contact">
        <p>
          Open a ticket in our Discord server. That is the fastest way to
          reach the people who can actually act on it.
        </p>
      </LegalSection>
    </LegalPage>
  );
}

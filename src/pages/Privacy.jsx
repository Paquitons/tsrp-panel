import LegalPage, { LegalSection } from "./LegalPage";

// ==================================================================
// Privacy Policy
//
// Written from what the system actually does rather than from a
// template: every item below corresponds to something this codebase
// really stores. If a feature starts collecting something new, it
// belongs here too.
// ==================================================================
export default function Privacy() {
  return (
    <LegalPage
      title="Privacy Policy"
      intro="What Texas State RP collects, why, and what we do not do with it."
    >
      <LegalSection heading="Who this covers">
        <p>
          This covers the Texas State RP website, the staff panel at this
          domain, and our Discord bot. Texas State RP is a community
          roleplay server. We are not affiliated with Roblox Corporation or
          with Discord.
        </p>
      </LegalSection>

      <LegalSection heading="If you just visit the website">
        <p>
          Public pages such as the roster, leaderboards and economy pages
          need no account and set no tracking cookies. We do not use
          advertising networks and we do not sell data to anyone.
        </p>
      </LegalSection>

      <LegalSection heading="If you play on our Roblox server">
        <p>We record activity from the game server so our staff can moderate it:</p>
        <ul>
          <li>Your Roblox username, display name and user ID</li>
          <li>Joining and leaving, and how long you were in the server</li>
          <li>Moderation actions taken about you, and the reason given</li>
          <li>Staff commands used in the server, including who ran them</li>
        </ul>
        <p>
          This is the same information the game already shows to staff in
          the server. We keep it so that moderation decisions can be
          reviewed later rather than taken on memory.
        </p>
      </LegalSection>

      <LegalSection heading="If you are a staff member">
        <p>Staff sign in to the panel with Discord, and we then hold:</p>
        <ul>
          <li>Your Discord account ID, username, avatar and the roles you hold with us</li>
          <li>The Roblox account linked to your staff profile</li>
          <li>Your duty hours, leave requests and staff record</li>
          <li>Support tickets you take part in, including their transcripts</li>
          <li>Actions you take through the panel and the bot, so they can be audited</li>
        </ul>
      </LegalSection>

      <LegalSection heading="Signing in with Roblox">
        <p>
          Staff can be asked to confirm their Roblox account through
          Roblox's own sign in. We receive only your Roblox user ID,
          username, display name and avatar picture. <strong>We never see
          your Roblox password, and we cannot act on your Roblox account or
          read anything else on it.</strong> We use it for one purpose: to
          be sure the right person is behind a staff account before that
          account is given moderation powers in our server.
        </p>
      </LegalSection>

      <LegalSection heading="What we do not do">
        <ul>
          <li>We do not sell or rent your information</li>
          <li>We do not use it for advertising</li>
          <li>We do not share it outside our staff team, except where the law requires it or where Roblox or Discord ask about a rule breach on their platform</li>
          <li>We do not ask for your real name, address, phone number or payment details, and you should never send them to us</li>
        </ul>
      </LegalSection>

      <LegalSection heading="How long we keep it">
        <p>
          Moderation records and staff records are kept for as long as the
          community runs, because an old record is often the reason a later
          decision is fair. Everything else is kept while it is useful and
          removed when it is not.
        </p>
      </LegalSection>

      <LegalSection heading="Young players">
        <p>
          Roblox is used by children, and some of our players will be
          under 13. We collect no more from a young player than from anyone
          else, and nothing we collect identifies a person outside Roblox or
          Discord. A parent or guardian can contact us to ask what we hold
          about their child and to ask us to remove it.
        </p>
      </LegalSection>

      <LegalSection heading="Asking us about your information">
        <p>
          Open a ticket in our Discord server and ask. You can ask what we
          hold about you, ask us to correct it, or ask us to delete it. We
          may keep a record of a ban or a serious rule breach even after a
          deletion request, because removing it would let the same thing
          happen again with no history.
        </p>
      </LegalSection>

      <LegalSection heading="Changes">
        <p>
          If this changes in a way that matters, we will say so in our
          Discord server rather than quietly editing the page.
        </p>
      </LegalSection>
    </LegalPage>
  );
}

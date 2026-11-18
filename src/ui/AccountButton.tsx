import { useState } from "react";
import { pendingLabel } from "../i18n";
import { profileHue } from "../auth/profile";
import { readSignedInPreference } from "../auth/session";
import { useCollection } from "../state/collection";

function initial(name: string, email: string): string {
  const source = name.trim() || email.trim();
  return (source[0] ?? "?").toLocaleUpperCase("de");
}

export function AccountButton() {
  const data = useCollection();
  const [open, setOpen] = useState(false);
  const [broken, setBroken] = useState(false);
  const profile = data.profile;
  const remembered = data.signedIn || data.reauthHint || readSignedInPreference();
  const face = remembered ? profile : null;
  const letter = initial(face?.name ?? "", face?.email ?? "");
  const hue = profileHue(face?.email || face?.name || "cmpc");
  const label = data.signedIn ? face?.name || data.t("signedIn") : data.reauthHint ? data.t("signInAgain") : data.t("signIn");
  const sync = !data.online
    ? data.t("accountOffline")
    : data.syncing
      ? data.t("syncing")
      : data.pending.length
        ? pendingLabel(data.lang, data.pending.length)
        : data.t("accountReady");

  return (
    <>
      <button
        type="button"
        className="avatar"
        aria-label={label}
        title={label}
        onClick={() => (data.signedIn ? setOpen(true) : data.signIn())}
      >
        {face?.picture && !broken ? (
          <img src={face.picture} alt="" onError={() => setBroken(true)} />
        ) : face ? (
          <span style={{ background: `hsl(${hue} 62% 42%)` }}>{letter}</span>
        ) : (
          <PersonIcon />
        )}
      </button>
      {open ? (
        <div className="modal" role="dialog" aria-modal="true" aria-label={label} onClick={() => setOpen(false)}>
          <div className="modalcard account" onClick={(event) => event.stopPropagation()}>
            <div className="who">
              {face?.picture && !broken ? <img src={face.picture} alt="" /> : <span style={{ background: `hsl(${hue} 62% 42%)` }}>{letter}</span>}
              <div>
                <b>{face?.name || data.t("signedIn")}</b>
                {face?.email ? <small>{face.email}</small> : null}
              </div>
            </div>
            <p>{sync}</p>
            <div className="modalactions">
              <button type="button" onClick={() => setOpen(false)}>{data.t("close")}</button>
              <button type="button" className="primary" onClick={() => { setOpen(false); data.signOut(); }}>{data.t("signOut")}</button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}

function PersonIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <circle cx="12" cy="8" r="3.2" fill="none" stroke="currentColor" strokeWidth="1.8" />
      <path d="M5.5 19.2c1.4-3 3.6-4.4 6.5-4.4s5.1 1.4 6.5 4.4" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  );
}

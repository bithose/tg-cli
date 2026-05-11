# tg-cli

A small Telegram user CLI built on [GramJS](https://gram.js.org/). It opens a persistent shell so you can inspect dialogs, send messages, read history, and sit inside a chat stream from one terminal session.

This is a user-account client. You need Telegram API credentials from your own Telegram account.

## Setup

Install dependencies:

```zsh
bun install
```

Create local config:

```zsh
cp .env.example .env
```

Fill in `TELEGRAM_API_ID` and `TELEGRAM_API_HASH` from <https://my.telegram.org/apps>. `TELEGRAM_PHONE` is the phone number associated with your account. 

Check the local setup:

```zsh
bun run doctor
```

Optionally link the command so it works from any directory:

```zsh
bun link
tg-cli 
```

## Usage

Start the persistent shell. If you have not logged in yet you will receive the authorization code on any other Telegram client you are signed into:

```zsh
bun run tg-cli
```

Common commands:

```text
tg-cli> send @username "hello"
tg-cli> dialogs       //list recent peers
tg-cli> dialogs 50
tg-cli> send me "string"
tg-cli> send "Exact Groupchat Title" "hello group"
tg-cli> history @username 20
tg-cli> inbox
inbox> :q
tg-cli> open "Some Group Title"
tg-cli> open @username
Some Group Title> message you want to send to the open chat
@username> message you want to send to the user
Some Group Title> :q
tg-cli> logout
tg-cli> :q
```

Inside `open <peer>` mode, tg-cli prints the last 20 messages, then any text except `:q` is sent to that chat. Incoming messages from that chat stream into the terminal above the prompt.

Inside `inbox` mode, incoming messages from every peer stream into the terminal above the prompt. It is read-only; type `:q` to return to `tg-cli>`.

Inbox lines are formatted by peer:

```text
2026-05-11 04:29 @username hello
2026-05-11 04:30 📣groupchat @username hello from the group
```

Peer values can be `me`, `@username`, a phone/contact, or an exact chat title. If a group title is not globally resolvable as a username, tg-cli searches your dialog list first.

One-shot commands still work for scripts and are recommended as skills to teach your agents:

```zsh
bun run tg-cli dialogs
bun run tg-cli send me "string i want to programmatically send to all of my devices"
bun run tg-cli history @username 100
bun run tg-cli --json history "Exact Groupchat Title" 1000
bun run tg-cli send @username "string i want to progammatically send to someone from my telegram"
bun run tg-cli send "Exact Groupchat Title" "string i want to programmatically send to a groupchat from my telegram"
bun run tg-cli inbox
bun run tg-cli --json inbox
```

`bun run tg-cli inbox` is useful as a dedicated notification window. Leave it open in one terminal and use `bun run tg-cli` in another terminal to respond.

Agents will prefer the one-shot commands, and can combine with other commands to manipulate the stdout:
`bun run tg-cli --json history @username 1000 > username_transcript.json`

## Auth Files

`tg-cli` stores local auth state in `.session`, stores the dedicated inbox auth state in `.session.inbox`, and reads credentials from `.env`. These files are ignored by git.

Override the session file for any command:

```zsh
TG_CLI_SESSION=.session.work bun run tg-cli
TG_CLI_SESSION=.session.inbox bun run tg-cli logout
```

To sign out:

```text
tg-cli> logout
```

That calls Telegram logout and removes the shell's active local session file. You can also remove the `.session.` files manually to force a fresh login on the next run.

## Display

Message history uses colored sender labels when stdout is a TTY. Your own messages are white; peers are assigned distinct colors for the current process.

Disable colors:

```zsh
NO_COLOR=1 bun run tg-cli
```

## Development

```zsh
bun run check
```

`bunfig.toml` keeps `bun run` output quiet so the shell starts cleanly.

## Security

!!Do not leak `.env` or `.session`!!
The session file can authorize your Telegram account from this client. If a session leaks, revoke it from Telegram's active sessions UI and rotate the local file with `logout`.

This project is not affiliated with Telegram.

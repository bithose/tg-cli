export type Command =
  | "login"
  | "shell"
  | "me"
  | "dialogs"
  | "send"
  | "history"
  | "open"
  | "inbox"
  | "logout"
  | "doctor"
  | ":q"
  | "exit"
  | "quit"
  | "help";

export type OutputMode = "text" | "json";

export type RuntimeOptions = {
  outputMode: OutputMode;
};

export type ChatMode = {
  peer: any;
  peerId: string;
  label: string;
};

export type InboxMode = {
  label: "inbox";
};

export type ShellMode = ChatMode | InboxMode;

export type MessageRecord = {
  id: string;
  date: string;
  peer?: string;
  peerKind?: "dm" | "group" | "unknown";
  sender: string;
  text: string;
  out: boolean;
};

export type DialogRecord = {
  id: string;
  title: string;
  username?: string;
  unreadCount: number;
};

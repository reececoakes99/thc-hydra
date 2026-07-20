import { createMcpHandler } from "mcp-handler";
import { z } from "zod";

const supportedServices = [
  "adam6500", "afp", "asterisk", "cisco", "cisco-enable", "cvs", "firebird",
  "ftp", "ftps", "http-get", "http-head", "http-post", "http-get-form",
  "http-post-form", "https-get", "https-head", "https-post", "https-get-form",
  "https-post-form", "http-proxy", "http-proxy-urlenum", "icq", "imap", "imaps",
  "irc", "ldap2", "ldap2s", "ldap3", "mssql", "mysql", "ncp", "nntp",
  "oracle", "oracle-listener", "oracle-sid", "pcanywhere", "pcnfs", "pop3",
  "pop3s", "postgres", "rdp", "radmin2", "redis", "rexec", "rlogin", "rpcap",
  "rsh", "rtsp", "s7-300", "sapr3", "sip", "smb", "smtp", "smtps",
  "smtp-enum", "snmp", "socks5", "ssh", "sshkey", "svn", "teamspeak",
  "telnet", "telnets", "vmauthd", "vnc", "xmpp"
] as const;

function quote(value: string): string {
  return `'${value.replace(/'/g, `'\\''`)}'`;
}

const handler = createMcpHandler(
  async (server) => {
    server.tool(
      "generate_hydra_command",
      "Build a THC Hydra command for an explicitly authorized security assessment. The command is returned for local execution because Vercel cannot run native CLI tools.",
      {
        target: z.string().describe("Authorized target hostname or IP address"),
        service: z.string().describe("Hydra service module, such as ssh, ftp, or http-post-form"),
        login: z.string().optional().describe("Single login name (-l)"),
        loginFile: z.string().optional().describe("Local login-list path (-L)"),
        password: z.string().optional().describe("Single password (-p)"),
        passwordFile: z.string().optional().describe("Local password-list path (-P)"),
        pairFile: z.string().optional().describe("Local colon-separated login/password file (-C)"),
        port: z.number().int().positive().optional().describe("Non-default target port (-s)"),
        tasks: z.number().int().min(1).max(64).optional().describe("Parallel task count (-t), capped at 64"),
        timeout: z.number().int().positive().optional().describe("Response timeout in seconds (-w)"),
        moduleOptions: z.string().optional().describe("Service-specific module option (-m)"),
        ssl: z.boolean().optional().describe("Use SSL/TLS (-S)"),
        stopOnSuccess: z.boolean().optional().describe("Stop after first valid pair (-f)"),
        ipv6: z.boolean().optional().describe("Use IPv6 mode (-6)"),
        extraArgs: z.array(z.string()).optional().describe("Additional Hydra arguments")
      },
      async ({ target, service, login, loginFile, password, passwordFile, pairFile, port, tasks, timeout, moduleOptions, ssl, stopOnSuccess, ipv6, extraArgs }) => {
        const args: string[] = [];
        if (pairFile) args.push("-C", quote(pairFile));
        else {
          if (login) args.push("-l", quote(login));
          if (loginFile) args.push("-L", quote(loginFile));
          if (password) args.push("-p", quote(password));
          if (passwordFile) args.push("-P", quote(passwordFile));
        }
        if (port) args.push("-s", String(port));
        if (tasks) args.push("-t", String(tasks));
        if (timeout) args.push("-w", String(timeout));
        if (moduleOptions) args.push("-m", quote(moduleOptions));
        if (ssl) args.push("-S");
        if (stopOnSuccess) args.push("-f");
        if (ipv6) args.push("-6");
        if (extraArgs) args.push(...extraArgs.map(quote));
        args.push(quote(target), quote(service));

        return {
          content: [{
            type: "text",
            text: `Authorized-use command (run locally where Hydra is installed):\n\nhydra ${args.join(" ")}\n\nOnly test systems you own or have explicit permission to assess. This server does not execute Hydra or contact the target.`
          }]
        };
      }
    );

    server.tool(
      "list_hydra_services",
      "List service modules documented by the upstream THC Hydra project.",
      {},
      async () => ({
        content: [{ type: "text", text: supportedServices.join("\n") }]
      })
    );

    server.tool(
      "get_hydra_service_help_command",
      "Return the local Hydra command that displays module-specific help for a service.",
      { service: z.string().describe("Hydra service module name") },
      async ({ service }) => ({
        content: [{
          type: "text",
          text: `Run locally:\n\nhydra -U ${quote(service)}\n\nThis server generates commands only and does not execute Hydra.`
        }]
      })
    );
  },
  {
    capabilities: {
      tools: {
        generate_hydra_command: { description: "Generate an authorized-use THC Hydra command for local execution" },
        list_hydra_services: { description: "List service modules supported by THC Hydra" },
        get_hydra_service_help_command: { description: "Generate a command to view Hydra module-specific help" }
      }
    }
  },
  { basePath: "", verboseLogs: true, maxDuration: 60, disableSse: true }
);

export { handler as GET, handler as POST, handler as DELETE };

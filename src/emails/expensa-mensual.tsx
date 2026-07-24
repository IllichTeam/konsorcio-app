import {
  Body,
  Container,
  Head,
  Heading,
  Hr,
  Html,
  Img,
  Link,
  Preview,
  Section,
  Text,
} from "react-email";

/**
 * Monthly expense email template.
 * Fork of `NotificacionConsorcio` layout — do not change that template.
 *
 * Greeting is fixed (`Vecino/a`). Maqueta data: automatic message, optional
 * drive link, optional payment alias, and PDF attachments (binaries via Resend;
 * filenames in the body link to signed download URLs when provided).
 */
export type ExpensaMensualAttachment = {
  filename: string;
  /** Signed/public download URL; omitted or invalid → plain filename text. */
  url?: string | null;
};

export type ExpensaMensualProps = {
  consorcio?: string;
  /** Dedicated period line under “del período:” (e.g. from `formatExpensePeriod`). */
  periodo: string;
  /** Body copy (e.g. from `buildMonthlyExpenseMessage`). */
  mensaje: string;
  /** Consortium drive / payment link; omitted or empty hides the link row. */
  linkUrl?: string | null;
  /** Payment alias from the consortium; omitted or empty hides the alias row. */
  paymentAlias?: string | null;
  /** PDFs listed under Adjuntos (optional `url` makes the filename clickable). */
  attachments?: ExpensaMensualAttachment[];
  remitente?: string;
  logoUrl?: string;
  unsubscribeUrl?: string;
  /** Sender profile line: address / phone / postal code. */
  footerContact?: string | null;
};

const colors = {
  pageBackground: "#f4f4f4",
  cardBackground: "#ffffff",
  primary: "#005696",
  primaryDark: "#003d6b",
  text: "#374151",
  textMuted: "#666666",
  infoBackground: "#e1effe",
  infoBorder: "#b6d4fe",
  divider: "#e5e7eb",
  link: "#005696",
} as const;

const EMPTY_ATTACHMENTS: ExpensaMensualAttachment[] = [];

export function ExpensaMensual({
  consorcio,
  periodo,
  mensaje,
  linkUrl,
  paymentAlias,
  attachments = EMPTY_ATTACHMENTS,
  remitente = "Administración",
  logoUrl,
  unsubscribeUrl,
  footerContact,
}: ExpensaMensualProps) {
  const preview = consorcio ? `Expensa mensual de ${consorcio}` : "Expensa mensual de su consorcio";

  const alias = paymentAlias?.trim() || null;
  const trimmedLink = linkUrl?.trim() || "";
  const resolvedLink = trimmedLink !== "" && URL.canParse(trimmedLink) ? trimmedLink : null;
  const hasInfoBlock = Boolean(alias || resolvedLink);
  const resolvedAttachments = attachments.map((attachment) => {
    const filename = attachment.filename.trim();
    const trimmedUrl = attachment.url?.trim() || "";
    const url = trimmedUrl !== "" && URL.canParse(trimmedUrl) ? trimmedUrl : null;
    return { filename, url };
  });
  const hasAttachments = resolvedAttachments.some((attachment) => attachment.filename !== "");
  const resolvedFooterContact = footerContact?.trim() || null;

  return (
    <Html lang="es">
      <Head />
      <Preview>{preview}</Preview>
      <Body style={main}>
        <Container style={outerContainer}>
          <table
            role="presentation"
            cellPadding={0}
            cellSpacing={0}
            width="100%"
            style={frameTable}
          >
            <tbody>
              <tr>
                <td colSpan={3} style={blueTopBar}>
                  &nbsp;
                </td>
              </tr>
              <tr>
                <td width={16} style={sideCell} aria-hidden="true">
                  <table role="presentation" cellPadding={0} cellSpacing={0} width={16}>
                    <tbody>
                      <tr>
                        <td style={blueSideStub}>&nbsp;</td>
                      </tr>
                    </tbody>
                  </table>
                </td>
                <td style={cardShell} aria-label="Expensa mensual de su consorcio">
                  <table
                    role="presentation"
                    cellPadding={0}
                    cellSpacing={0}
                    width="100%"
                    style={card}
                  >
                    <tbody>
                      <tr>
                        <td>
                          <Section style={cardBody}>
                            <Text style={brandMark}>ExpensasYa</Text>

                            <Section style={logoSection}>
                              {logoUrl ? (
                                <Img
                                  src={logoUrl}
                                  width={56}
                                  height={56}
                                  alt="ExpensasYa"
                                  style={logo}
                                />
                              ) : (
                                <table
                                  role="presentation"
                                  cellPadding={0}
                                  cellSpacing={0}
                                  style={logoTable}
                                >
                                  <tbody>
                                    <tr>
                                      <td align="center" style={logoBadge}>
                                        E
                                      </td>
                                    </tr>
                                  </tbody>
                                </table>
                              )}
                            </Section>

                            <Heading style={title}>Expensa mensual</Heading>

                            <Text style={paragraph}>Hola Vecino/a,</Text>

                            <Text style={paragraph}>
                              {consorcio ? (
                                <>
                                  Nos comunicamos desde la administración de{" "}
                                  <strong style={strongText}>{consorcio}</strong> para enviarle las
                                  expensas del período:
                                </>
                              ) : (
                                <>
                                  Nos comunicamos desde la administración para enviarle las expensas
                                  del período:
                                </>
                              )}
                            </Text>

                            <Text style={periodText}>{periodo}</Text>

                            <Section style={messageBox}>
                              <Text style={messageText}>{mensaje}</Text>
                            </Section>

                            {hasInfoBlock ? (
                              <Section style={infoSection}>
                                <Text style={infoIntro}>
                                  A continuación dejamos información relevante:
                                </Text>
                                {alias ? (
                                  <Text style={infoRow}>
                                    <span style={infoLabel}>Alias de cobro: </span>
                                    <strong style={strongText}>{alias}</strong>
                                  </Text>
                                ) : null}
                                {resolvedLink ? (
                                  <Text style={infoRow}>
                                    <span style={infoLabel}>Link de drive: </span>
                                    <Link href={resolvedLink} style={infoLink}>
                                      {resolvedLink}
                                    </Link>
                                  </Text>
                                ) : null}
                              </Section>
                            ) : null}

                            {hasAttachments ? (
                              <Section style={attachmentsSection}>
                                <Text style={attachmentsHeading}>Adjuntos</Text>
                                {resolvedAttachments.map((attachment) =>
                                  attachment.filename === "" ? null : (
                                    <Text key={attachment.filename} style={attachmentItem}>
                                      •{" "}
                                      {attachment.url ? (
                                        <Link href={attachment.url} style={infoLink}>
                                          {attachment.filename}
                                        </Link>
                                      ) : (
                                        attachment.filename
                                      )}
                                    </Text>
                                  ),
                                )}
                              </Section>
                            ) : null}

                            <Text style={paragraph}>
                              Si tiene cualquier duda, no dude en responder a este correo.
                            </Text>

                            <Text style={farewell}>{`Un cordial saludo, ${remitente}`}</Text>
                          </Section>
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </td>
                <td width={16} style={sideCell} aria-hidden="true">
                  <table role="presentation" cellPadding={0} cellSpacing={0} width={16}>
                    <tbody>
                      <tr>
                        <td style={blueSideStub}>&nbsp;</td>
                      </tr>
                    </tbody>
                  </table>
                </td>
              </tr>
            </tbody>
          </table>

          <Section style={footer}>
            <Text style={footerSlogan}>
              Gestionamos tu consorcio de forma simple, clara y transparente.
            </Text>

            <Hr style={hr} />

            {resolvedFooterContact ? (
              <Text style={footerAddress}>{resolvedFooterContact}</Text>
            ) : null}

            {unsubscribeUrl ? (
              <>
                <Hr style={hr} />
                <Text style={footerUnsub}>
                  <Link href={unsubscribeUrl} style={footerLink}>
                    Cancelar la suscripción a estos correos.
                  </Link>
                </Text>
              </>
            ) : null}
          </Section>
        </Container>
      </Body>
    </Html>
  );
}

export default ExpensaMensual;

ExpensaMensual.PreviewProps = {
  consorcio: "Edificio Rivadavia 1234",
  periodo: "Julio de 2026",
  mensaje: "Nos complace acercarle las expensas mensuales del consorcio Edificio Rivadavia 1234.",
  linkUrl: "https://drive.google.com/drive/folders/ejemplo",
  paymentAlias: "rivadavia.expensas",
  attachments: [
    {
      filename: "expensa-julio-2026.pdf",
      url: "https://signed.example/expensa-julio-2026.pdf",
    },
    {
      filename: "detalle-gastos.pdf",
      url: "https://signed.example/detalle-gastos.pdf",
    },
  ],
  remitente: "Administración Edificio Rivadavia",
  footerContact: "Av. Corrientes 1847, Piso 5 Of. B, CABA - CP: 1043 / Teléfono: +54911-12345678",
} satisfies ExpensaMensualProps;

const fontFamily =
  "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif";

const main: React.CSSProperties = {
  backgroundColor: colors.pageBackground,
  fontFamily,
  margin: 0,
  padding: "32px 16px",
};

const outerContainer: React.CSSProperties = {
  margin: "0 auto",
  maxWidth: "600px",
  width: "100%",
};

const frameTable: React.CSSProperties = {
  margin: "0 auto",
  maxWidth: "600px",
  width: "100%",
};

const blueTopBar: React.CSSProperties = {
  backgroundColor: colors.primaryDark,
  borderRadius: "16px 16px 0 0",
  fontSize: 0,
  height: "48px",
  lineHeight: "48px",
};

const sideCell: React.CSSProperties = {
  fontSize: 0,
  lineHeight: 0,
  verticalAlign: "top",
  width: "16px",
};

const blueSideStub: React.CSSProperties = {
  backgroundColor: colors.primaryDark,
  fontSize: 0,
  height: "88px",
  lineHeight: "88px",
  width: "16px",
};

/** Blue behind the top of the white card so rounded corners reveal blue, not page gray. */
const cardShell: React.CSSProperties = {
  backgroundColor: colors.pageBackground,
  backgroundImage: `linear-gradient(to bottom, ${colors.primaryDark} 0, ${colors.primaryDark} 104px, ${colors.pageBackground} 104px)`,
  verticalAlign: "top",
};

const card: React.CSSProperties = {
  backgroundColor: colors.cardBackground,
  border: `1px solid ${colors.infoBorder}`,
  borderRadius: "16px",
  width: "100%",
};

const cardBody: React.CSSProperties = {
  padding: "28px 40px 32px",
};

const brandMark: React.CSSProperties = {
  color: colors.primary,
  fontSize: "13px",
  fontWeight: 700,
  letterSpacing: "0.04em",
  lineHeight: "20px",
  margin: "0 0 20px",
  textAlign: "left",
};

const logoSection: React.CSSProperties = {
  margin: "0 0 20px",
  textAlign: "center",
};

const logo: React.CSSProperties = {
  display: "inline-block",
  margin: "0 auto",
};

const logoTable: React.CSSProperties = {
  margin: "0 auto",
};

const logoBadge: React.CSSProperties = {
  backgroundColor: colors.primary,
  borderRadius: "14px",
  color: "#ffffff",
  fontFamily,
  fontSize: "30px",
  fontWeight: 800,
  height: "56px",
  letterSpacing: "-0.04em",
  lineHeight: "56px",
  textAlign: "center",
  verticalAlign: "middle",
  width: "56px",
};

const title: React.CSSProperties = {
  color: colors.primary,
  fontSize: "24px",
  fontWeight: 700,
  lineHeight: "32px",
  margin: "0 0 28px",
  textAlign: "center",
};

const paragraph: React.CSSProperties = {
  color: colors.text,
  fontSize: "15px",
  lineHeight: "24px",
  margin: "0 0 16px",
};

const strongText: React.CSSProperties = {
  color: colors.text,
  fontWeight: 700,
};

const periodText: React.CSSProperties = {
  color: colors.primary,
  fontSize: "20px",
  fontWeight: 700,
  lineHeight: "28px",
  margin: "0 0 16px",
};

const messageBox: React.CSSProperties = {
  backgroundColor: colors.infoBackground,
  border: `1px solid ${colors.infoBorder}`,
  borderRadius: "8px",
  margin: "0 0 20px",
  padding: "16px 20px",
};

const messageText: React.CSSProperties = {
  color: colors.primary,
  fontSize: "15px",
  fontWeight: 700,
  lineHeight: "24px",
  margin: 0,
  whiteSpace: "pre-line",
};

const infoSection: React.CSSProperties = {
  margin: "0 0 20px",
};

const infoIntro: React.CSSProperties = {
  color: colors.textMuted,
  fontSize: "13px",
  fontWeight: 600,
  lineHeight: "20px",
  margin: "0 0 8px",
};

const infoRow: React.CSSProperties = {
  color: colors.text,
  fontSize: "15px",
  lineHeight: "24px",
  margin: "0 0 6px",
};

const infoLabel: React.CSSProperties = {
  color: colors.textMuted,
};

const infoLink: React.CSSProperties = {
  color: colors.link,
  fontWeight: 700,
  textDecoration: "underline",
  wordBreak: "break-all",
};

const attachmentsSection: React.CSSProperties = {
  margin: "0 0 20px",
};

const attachmentsHeading: React.CSSProperties = {
  color: colors.textMuted,
  fontSize: "13px",
  fontWeight: 600,
  lineHeight: "20px",
  margin: "0 0 6px",
};

const attachmentItem: React.CSSProperties = {
  color: colors.text,
  fontSize: "15px",
  lineHeight: "22px",
  margin: "0 0 2px",
};

const farewell: React.CSSProperties = {
  color: colors.text,
  fontSize: "15px",
  lineHeight: "24px",
  margin: "8px 0 0",
};

const footer: React.CSSProperties = {
  padding: "28px 16px 8px",
  textAlign: "center",
};

const footerSlogan: React.CSSProperties = {
  color: colors.textMuted,
  fontSize: "14px",
  lineHeight: "22px",
  margin: "0 0 16px",
};

const footerAddress: React.CSSProperties = {
  color: colors.textMuted,
  fontSize: "13px",
  lineHeight: "20px",
  margin: "0 0 16px",
};

const hr: React.CSSProperties = {
  borderColor: colors.divider,
  borderTop: `1px solid ${colors.divider}`,
  margin: "16px 0",
};

const footerUnsub: React.CSSProperties = {
  fontSize: "13px",
  lineHeight: "20px",
  margin: 0,
};

const footerLink: React.CSSProperties = {
  color: colors.link,
  textDecoration: "underline",
};

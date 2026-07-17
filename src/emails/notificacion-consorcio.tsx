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
} from "@react-email/components";

export type NotificacionConsorcioProps = {
  nombre?: string;
  consorcio?: string;
  mensaje: string;
  remitente?: string;
  logoUrl?: string;
  unsubscribeUrl?: string;
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

export function NotificacionConsorcio({
  nombre = "Vecino",
  consorcio,
  mensaje,
  remitente = "Administración",
  logoUrl,
  unsubscribeUrl,
}: NotificacionConsorcioProps) {
  const preview = consorcio
    ? `Nueva notificación de la administración de ${consorcio}`
    : "Nueva notificación de la administración";

  return (
    <Html lang="es">
      <Head />
      <Preview>{preview}</Preview>
      <Body style={main}>
        <Container style={outerContainer}>
          {/*
            Table frame: full-width blue top + short blue stubs on BOTH sides.
            Side cells use a nested table of fixed height so blue does not run
            the full card height (email-safe; avoids width:100% + margin clipping).
          */}
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
                <td style={card} aria-label="Notificación de su consorcio">
                  <Section style={cardBody}>
                    <Text style={brandMark}>Konsorcio</Text>

                    <Section style={logoSection}>
                      {logoUrl ? (
                        <Img src={logoUrl} width={56} height={56} alt="Konsorcio" style={logo} />
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
                                K
                              </td>
                            </tr>
                          </tbody>
                        </table>
                      )}
                    </Section>

                    <Heading style={title}>Notificación de su consorcio</Heading>

                    <Text style={paragraph}>{`Hola ${nombre},`}</Text>

                    <Text style={paragraph}>
                      {consorcio ? (
                        <>
                          Nos comunicamos desde la administración de{" "}
                          <strong style={strongText}>{consorcio}</strong> para compartir la
                          siguiente información:
                        </>
                      ) : (
                        <>
                          Nos comunicamos desde la administración para compartir la siguiente
                          información:
                        </>
                      )}
                    </Text>

                    <Section style={messageBox}>
                      <Text style={messageText}>{mensaje}</Text>
                    </Section>

                    <Text style={paragraph}>
                      Si tiene cualquier duda, no dude en responder a este correo.
                    </Text>

                    <Text style={farewell}>
                      Un cordial saludo,
                      <br />
                      {remitente}
                    </Text>
                  </Section>
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

            <Text style={footerAddress}>
              123 Calle Principal, Piso 1, Ciudad Autónoma de Buenos Aires, C1000
            </Text>

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

export default NotificacionConsorcio;

NotificacionConsorcio.PreviewProps = {
  nombre: "Nombre Vecino",
  consorcio: "Edificio Rivadavia 1234",
  mensaje:
    "Le informamos que el ascensor principal estará fuera de servicio el sábado 20 de 9:00 a 14:00 por mantenimiento programado.",
  remitente: "Administración Edificio Rivadavia",
} satisfies NotificacionConsorcioProps;

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

/** Short blue stub on each side — stops near the logo/title, not full card height. */
const blueSideStub: React.CSSProperties = {
  backgroundColor: colors.primaryDark,
  fontSize: 0,
  height: "88px",
  lineHeight: "88px",
  width: "16px",
};

const card: React.CSSProperties = {
  backgroundColor: colors.cardBackground,
  border: `1px solid ${colors.infoBorder}`,
  borderRadius: "16px",
  verticalAlign: "top",
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

/** Inline brand mark — rounded square with a bold K (no image dependency). */
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

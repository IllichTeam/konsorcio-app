import {
  Body,
  Container,
  Head,
  Heading,
  Hr,
  Html,
  Preview,
  Section,
  Tailwind,
  Text,
  pixelBasedPreset,
} from "react-email";

export type NotificationEmailProps = {
  recipientName?: string;
  subject: string;
  body: string;
};

/**
 * Renders a single line of `body` text, preserving blank lines as spacing.
 */
function BodyLine({ line, index }: { line: string; index: number }) {
  if (line.trim().length === 0) {
    return (
      <Text key={index} className="m-0 h-3 leading-3">
        &nbsp;
      </Text>
    );
  }

  return (
    <Text key={index} className="m-0 text-sm leading-6 text-foreground">
      {line}
    </Text>
  );
}

export function NotificationEmail({ recipientName, subject, body }: NotificationEmailProps) {
  const greeting = recipientName ? `Hola ${recipientName},` : "Hola,";
  const lines = body.split("\n");

  return (
    <Html lang="es">
      <Head />
      <Preview>{subject}</Preview>
      <Tailwind
        config={{
          presets: [pixelBasedPreset],
          theme: {
            extend: {
              colors: {
                background: "#f1f3f5",
                card: "#fcfdff",
                border: "#dadde0",
                foreground: "#111921",
                muted: "#5d646c",
                primary: "#0069a8",
              },
            },
          },
        }}
      >
        <Body className="m-0 bg-background py-10 font-sans">
          <Container className="mx-auto w-full max-w-[480px] px-4">
            <Text className="m-0 mb-4 text-sm font-bold tracking-wide text-primary">Konsorcio</Text>

            <Section className="rounded-lg border border-solid border-border bg-card px-6 py-6">
              <Text className="m-0 mb-4 text-sm leading-6 text-foreground">{greeting}</Text>

              <Heading className="m-0 mb-4 text-lg font-semibold leading-7 text-foreground">
                {subject}
              </Heading>

              {lines.map((line, index) => (
                <BodyLine key={index} line={line} index={index} />
              ))}
            </Section>

            <Hr className="mx-0 my-6 border-border" />
            <Text className="m-0 text-xs leading-5 text-muted">
              Este es un mensaje automático de Konsorcio.
            </Text>
          </Container>
        </Body>
      </Tailwind>
    </Html>
  );
}

NotificationEmail.PreviewProps = {
  recipientName: "Ana",
  subject: "Recordatorio de pago de cuota de condominio",
  body: "Le recordamos que la cuota de condominio del mes vence el día 25.\n\nPor favor realice su pago a tiempo para evitar recargos.\n\nGracias por su atención.",
} satisfies NotificationEmailProps;

export default NotificationEmail;

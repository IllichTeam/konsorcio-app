import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

// `useEmailRecipients`/`useSendEmail` wrap react-query and already own the
// send-result toasts; mocking the hook module lets this test drive loading,
// error, and mutation state directly without a QueryClientProvider.
vi.mock("@/hooks/use-emails", () => ({
  useEmailRecipients: vi.fn(),
  useSendEmail: vi.fn(),
}));

const { useEmailRecipients, useSendEmail } = await import("@/hooks/use-emails");
const { NotificacionesScreen } = await import("./notificaciones-screen");

const recipientOptions = [
  { id: "user-1", name: "Ana Torres", email: "ana@example.com" },
  { id: "user-2", name: "Beto Ruiz", email: "beto@example.com" },
];

const mutateAsyncMock = vi.fn();

function mockRecipients(overrides: Partial<ReturnType<typeof useEmailRecipients>> = {}) {
  vi.mocked(useEmailRecipients).mockReturnValue({
    data: recipientOptions,
    isLoading: false,
    isError: false,
    ...overrides,
  } as ReturnType<typeof useEmailRecipients>);
}

function mockSendEmail(overrides: Partial<ReturnType<typeof useSendEmail>> = {}) {
  vi.mocked(useSendEmail).mockReturnValue({
    mutate: vi.fn(),
    mutateAsync: mutateAsyncMock,
    isPending: false,
    ...overrides,
  } as ReturnType<typeof useSendEmail>);
}

beforeEach(() => {
  mutateAsyncMock.mockReset();
  mockRecipients();
  mockSendEmail();
});

describe("NotificacionesScreen", () => {
  it("renders the available recipient options", () => {
    render(<NotificacionesScreen />);

    expect(screen.getByText("Ana Torres")).toBeInTheDocument();
    expect(screen.getByText("ana@example.com")).toBeInTheDocument();
    expect(screen.getByText("Beto Ruiz")).toBeInTheDocument();
  });

  it("shows Spanish validation errors and does not submit when the form is empty", async () => {
    const user = userEvent.setup();
    render(<NotificacionesScreen />);

    await user.click(screen.getByRole("button", { name: "Enviar" }));

    expect(await screen.findByText("Selecciona al menos un destinatario")).toBeInTheDocument();
    expect(await screen.findByText("El asunto es obligatorio")).toBeInTheDocument();
    expect(await screen.findByText("El mensaje es obligatorio")).toBeInTheDocument();
    expect(mutateAsyncMock).not.toHaveBeenCalled();
  });

  it("calls the send mutation with the expected payload for a valid form", async () => {
    mutateAsyncMock.mockResolvedValue({ status: "sent", sent: 1, failed: 0, resendIds: ["id-1"] });
    const user = userEvent.setup();
    render(<NotificacionesScreen />);

    await user.click(screen.getByRole("checkbox", { name: /Ana Torres/ }));
    await user.type(screen.getByLabelText("Asunto"), "Corte de agua");
    await user.type(screen.getByLabelText("Mensaje"), "El servicio se corta mañana a las 9am.");
    await user.click(screen.getByRole("button", { name: "Enviar" }));

    expect(mutateAsyncMock).toHaveBeenCalledTimes(1);
    expect(mutateAsyncMock).toHaveBeenCalledWith({
      subject: "Corte de agua",
      body: "El servicio se corta mañana a las 9am.",
      recipients: [{ email: "ana@example.com", name: "Ana Torres" }],
    });
  });
});

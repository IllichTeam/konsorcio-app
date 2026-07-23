import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import {
  isInvalidCurrentPasswordError,
  isValidFiscalAddress,
  isValidPostalCode,
  isValidProfilePhone,
  profileSchema,
} from "@/components/profile/profile-form";

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: vi.fn(),
    refresh: vi.fn(),
  }),
}));

vi.mock("@/components/dashboard/dashboard-user-context", () => ({
  useDashboardUserActions: () => ({
    patchUser: vi.fn(),
  }),
}));

const changePasswordMock = vi.fn();
const updateUserMock = vi.fn();

vi.mock("@/lib/auth-client", () => ({
  authClient: {
    changePassword: (...args: unknown[]) => changePasswordMock(...args),
    updateUser: (...args: unknown[]) => updateUserMock(...args),
  },
}));

const { ProfileForm } = await import("./profile-form");

const user = {
  id: "user-1",
  name: "Admin",
  email: "illich570@gmail.com",
  phone: null,
  address: null,
  postalCode: null,
  image: null,
  role: "admin" as const,
  createdAt: new Date(),
  updatedAt: new Date(),
  emailVerified: true,
  banned: false,
  banReason: null,
  banExpires: null,
};

function baseValues(
  overrides: Partial<{
    name: string;
    email: string;
    phone: string;
    address: string;
    postalCode: string;
    currentPassword: string;
    newPassword: string;
    confirmPassword: string;
  }> = {},
) {
  return {
    name: "Admin",
    email: "illich570@gmail.com",
    phone: "",
    address: "",
    postalCode: "",
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
    ...overrides,
  };
}

function issuePaths(result: ReturnType<typeof profileSchema.safeParse>) {
  if (result.success) return [];
  return result.error.issues.map((issue) => issue.path.join(".")).toSorted();
}

describe("phone and address helpers", () => {
  it("accepts phones that include 911 plus at least 8 more digits", () => {
    expect(isValidProfilePhone("+54911-12345678")).toBe(true);
    expect(isValidProfilePhone("91112345678")).toBe(true);
    expect(isValidProfilePhone("12345678")).toBe(false);
    expect(isValidProfilePhone("9111234")).toBe(false);
  });

  it("rejects number-only fiscal addresses", () => {
    expect(isValidFiscalAddress("Av. Corrientes 1847")).toBe(true);
    expect(isValidFiscalAddress("Gurruchaga 2266")).toBe(true);
    expect(isValidFiscalAddress("1847")).toBe(false);
    expect(isValidFiscalAddress("12345678")).toBe(false);
    expect(isValidFiscalAddress("ab")).toBe(false);
  });

  it("accepts exactly four digit postal codes", () => {
    expect(isValidPostalCode("1000")).toBe(true);
    expect(isValidPostalCode("1414")).toBe(true);
    expect(isValidPostalCode("100")).toBe(false);
    expect(isValidPostalCode("10000")).toBe(false);
    expect(isValidPostalCode("10.0")).toBe(false);
    expect(isValidPostalCode("abcd")).toBe(false);
  });
});

describe("profileSchema password rules", () => {
  it("allows saving profile fields with no password changes", () => {
    const result = profileSchema.safeParse(
      baseValues({
        phone: "+54911-12345678",
        address: "Av. Corrientes 1847, CABA",
        postalCode: "1043",
      }),
    );
    expect(result.success).toBe(true);
  });

  it("rejects invalid postal codes when provided", () => {
    const result = profileSchema.safeParse(
      baseValues({
        postalCode: "12",
      }),
    );
    expect(result.success).toBe(false);
    expect(issuePaths(result)).toEqual(["postalCode"]);
  });

  it("requires all three password fields when only current is filled", () => {
    const result = profileSchema.safeParse(
      baseValues({
        currentPassword: "clave-cualquiera",
      }),
    );

    expect(result.success).toBe(false);
    expect(issuePaths(result)).toEqual(["confirmPassword", "newPassword"]);
  });

  it("only requires current password when new + confirm are valid and filled", () => {
    const result = profileSchema.safeParse(
      baseValues({
        newPassword: "nuevaClave1",
        confirmPassword: "nuevaClave1",
      }),
    );

    expect(result.success).toBe(false);
    expect(issuePaths(result)).toEqual(["currentPassword"]);
  });

  it("requires current and confirm when new password is valid but both are empty", () => {
    const result = profileSchema.safeParse(
      baseValues({
        newPassword: "nuevaClave1",
      }),
    );

    expect(result.success).toBe(false);
    expect(issuePaths(result)).toEqual(["confirmPassword", "currentPassword"]);
  });

  it("requires current, new length, and confirm when new password is too short", () => {
    const result = profileSchema.safeParse(
      baseValues({
        newPassword: "corta",
      }),
    );

    expect(result.success).toBe(false);
    expect(issuePaths(result)).toEqual(["confirmPassword", "currentPassword", "newPassword"]);
  });

  it("flags mismatched confirmation", () => {
    const result = profileSchema.safeParse(
      baseValues({
        currentPassword: "pruebas123",
        newPassword: "nuevaClave1",
        confirmPassword: "otraClave1",
      }),
    );

    expect(result.success).toBe(false);
    if (result.success) return;
    expect(result.error.issues).toHaveLength(1);
    expect(result.error.issues[0]?.path).toEqual(["confirmPassword"]);
    expect(result.error.issues[0]?.message).toBe("Las contraseñas no coinciden");
  });

  it("rejects a new password equal to the current one", () => {
    const result = profileSchema.safeParse(
      baseValues({
        currentPassword: "pruebas123",
        newPassword: "pruebas123",
        confirmPassword: "pruebas123",
      }),
    );

    expect(result.success).toBe(false);
    if (result.success) return;
    expect(result.error.issues).toHaveLength(1);
    expect(result.error.issues[0]?.path).toEqual(["newPassword"]);
    expect(result.error.issues[0]?.message).toBe(
      "La nueva contraseña debe ser distinta a la actual",
    );
  });

  it("rejects invalid phone and number-only address", () => {
    const result = profileSchema.safeParse(
      baseValues({
        phone: "12345678",
        address: "99887766",
      }),
    );

    expect(result.success).toBe(false);
    expect(issuePaths(result)).toEqual(["address", "phone"]);
    if (result.success) return;
    const addressIssue = result.error.issues.find((issue) => issue.path[0] === "address");
    expect(addressIssue?.message).toBe("Se necesita una dirección fiscal real");
  });
});

describe("isInvalidCurrentPasswordError", () => {
  it("detects better-auth invalid password responses", () => {
    expect(isInvalidCurrentPasswordError({ code: "INVALID_PASSWORD" })).toBe(true);
    expect(isInvalidCurrentPasswordError({ message: "Invalid password" })).toBe(true);
    expect(isInvalidCurrentPasswordError({ message: "Network error" })).toBe(false);
  });
});

describe("ProfileForm password panel", () => {
  beforeEach(() => {
    changePasswordMock.mockReset();
    updateUserMock.mockReset();
    updateUserMock.mockResolvedValue({ error: null });
    changePasswordMock.mockResolvedValue({ error: null });
  });

  it("keeps confirm disabled until the new password has at least 8 characters", async () => {
    const events = userEvent.setup();
    render(<ProfileForm user={user} />);

    await events.click(screen.getByRole("button", { name: "Cambiar contraseña" }));

    const confirm = screen.getByLabelText("Confirmar contraseña");
    expect(confirm).toBeDisabled();

    await events.type(screen.getByLabelText("Nueva contraseña"), "corta");
    expect(confirm).toBeDisabled();

    await events.type(screen.getByLabelText("Nueva contraseña"), "123");
    expect(screen.getByLabelText("Confirmar contraseña")).toBeEnabled();
  });

  it("blocks save when only current password is filled", async () => {
    const events = userEvent.setup();
    render(<ProfileForm user={user} />);

    await events.click(screen.getByRole("button", { name: "Cambiar contraseña" }));
    await events.type(screen.getByLabelText("Contraseña actual"), "clave-incorrecta");
    await events.click(screen.getByRole("button", { name: "Guardar cambios" }));

    expect(await screen.findByText("Ingresá la nueva contraseña")).toBeInTheDocument();
    expect(screen.getByText("Repetí la nueva contraseña")).toBeInTheDocument();
    expect(changePasswordMock).not.toHaveBeenCalled();
    expect(updateUserMock).not.toHaveBeenCalled();
  });

  it("shows a field error when the current password does not match the login credential", async () => {
    changePasswordMock.mockResolvedValue({
      error: { code: "INVALID_PASSWORD", message: "Invalid password" },
    });
    const events = userEvent.setup();
    render(<ProfileForm user={user} />);

    await events.click(screen.getByRole("button", { name: "Cambiar contraseña" }));
    await events.type(screen.getByLabelText("Contraseña actual"), "clave-incorrecta");
    await events.type(screen.getByLabelText("Nueva contraseña"), "nuevaClave1");
    await events.type(screen.getByLabelText("Confirmar contraseña"), "nuevaClave1");
    await events.click(screen.getByRole("button", { name: "Guardar cambios" }));

    expect(await screen.findByText("La contraseña actual es incorrecta")).toBeInTheDocument();
    expect(updateUserMock).not.toHaveBeenCalled();
    expect(changePasswordMock).toHaveBeenCalledWith({
      currentPassword: "clave-incorrecta",
      newPassword: "nuevaClave1",
    });
  });
});

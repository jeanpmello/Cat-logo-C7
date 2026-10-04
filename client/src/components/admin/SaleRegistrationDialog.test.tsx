// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import SaleRegistrationDialog from "./SaleRegistrationDialog";

afterEach(cleanup);

describe("diálogo de registro de venda", () => {
  it("exige selecionar um vendedor elegível e envia o id escolhido", () => {
    const onSubmit = vi.fn();
    const onClose = vi.fn();

    render(
      <SaleRegistrationDialog
        product={{ id: 7, brand: "Dell", model: "Latitude 5420" }}
        sellers={[{ id: 12, name: "Ana Lima" }, { id: 34, name: "Caio Souza" }]}
        isLoadingSellers={false}
        isSubmitting={false}
        onClose={onClose}
        onSubmit={onSubmit}
      />,
    );

    const selector = screen.getByRole("combobox", { name: "Quem vendeu" }) as HTMLSelectElement;
    const submitButton = screen.getByRole("button", { name: "Confirmar venda" });
    expect(selector.required).toBe(true);
    expect(submitButton.hasAttribute("disabled")).toBe(true);
    expect(screen.getByRole("option", { name: "Ana Lima (#12)" })).toBeTruthy();
    expect(screen.getByRole("option", { name: "Caio Souza (#34)" })).toBeTruthy();

    fireEvent.change(selector, { target: { value: "34" } });
    expect(submitButton.hasAttribute("disabled")).toBe(false);
    fireEvent.click(submitButton);

    expect(onSubmit).toHaveBeenCalledOnce();
    expect(onSubmit).toHaveBeenCalledWith(34);
  });
});

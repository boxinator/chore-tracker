import { expect, test } from "@playwright/test";

test("happy path: add, assign, complete, redeem", async ({ page, context, request }) => {
  await request.post("/api/children", { data: { name: "Sample Child 1" } });
  await request.post("/api/children", { data: { name: "Sample Child 2" } });
  await request.post("/api/rewards", {
    data: {
      name: "Extra Dessert",
      description: "A test reward",
      cost: 3
    }
  });

  await page.goto("/");

  await expect(page.getByRole("heading", { name: "Quest Board" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Sample Child 1" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Sample Child 2" })).toBeVisible();

  await page.getByRole("button", { name: "Add", exact: true }).click();
  const addDialog = page.getByRole("dialog", { name: "Add chore" });
  await addDialog.getByLabel("Title").fill("Playwright Chore");
  await addDialog.getByLabel("Description").fill("Created by end-to-end verification");
  await addDialog.getByLabel("Points").fill("6");
  await addDialog.getByRole("button", { name: "Add Chore" }).click();

  await expect(page.getByText("Playwright Chore")).toBeVisible();

  const unassignedCard = page.locator(".chore-card").filter({ hasText: "Playwright Chore" });
  await unassignedCard.getByRole("button", { name: "Edit Playwright Chore" }).click();

  const detailDialog = page.getByRole("dialog", { name: "Playwright Chore" });
  const sampleChild2AssignmentRow = detailDialog.locator(".assignment-row").filter({ hasText: "Sample Child 2" });
  await sampleChild2AssignmentRow.getByRole("button", { name: "All" }).click();
  await detailDialog.getByRole("button", { name: "Save Changes" }).click();

  const sampleChild2Lane = page.locator("section.lane").filter({
    has: page.getByRole("heading", { name: "Sample Child 2" })
  });
  const sampleChild2Total = sampleChild2Lane.locator(".lane-header p");
  await expect(sampleChild2Lane.getByText("Playwright Chore")).toBeVisible();
  await expect(sampleChild2Total).toHaveText("0 pts");

  const choreCard = page.locator(".chore-card").filter({ hasText: "Playwright Chore" });
  await choreCard.getByRole("button", { name: "Mark Playwright Chore complete" }).click();
  await expect(choreCard.getByText("Completed today")).toBeVisible();
  await expect(sampleChild2Total).toHaveText("6 pts");

  await sampleChild2Lane.getByRole("button", { name: "Rewards" }).click();
  const rewardDialog = page.getByRole("dialog", { name: "Sample Child 2" });
  await expect(rewardDialog.getByRole("heading", { name: "Sample Child 2" })).toBeVisible();
  await rewardDialog.getByRole("button", { name: /Extra Dessert/i }).click();
  await rewardDialog.getByRole("button", { name: "Confirm" }).click();
  await expect(rewardDialog.getByText("Redeemed")).toBeVisible();
  await page.waitForTimeout(900);
  await expect(sampleChild2Total).toHaveText("3 pts");

  page.once("dialog", (dialog) => dialog.accept());
  await choreCard.getByRole("button", { name: /Delete Playwright Chore/i }).click();
  await expect(page.getByText("Playwright Chore")).toHaveCount(0);

  await context.close();
});

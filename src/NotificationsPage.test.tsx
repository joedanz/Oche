// ABOUTME: Tests for the notifications page component.
// ABOUTME: Verifies notification list rendering, read/unread toggling, and preference management.

import { render, screen, cleanup } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { vi, describe, it, expect, beforeEach, afterEach } from "vitest";
import { MemoryRouter } from "react-router-dom";

const mockUseQuery = vi.fn();
const mockUseMutation = vi.fn();

vi.mock("convex/react", () => ({
  useQuery: (...args: any[]) => mockUseQuery(...args),
  useMutation: (...args: any[]) => mockUseMutation(...args),
}));

vi.mock("../convex/_generated/api", () => ({
  api: {
    notifications: {
      getNotifications: "notifications:getNotifications",
      markRead: "notifications:markRead",
      getPreferences: "notifications:getPreferences",
      updatePreferences: "notifications:updatePreferences",
    },
  },
}));

describe("NotificationsPage", () => {
  const mockMarkRead = vi.fn();
  const mockUpdatePrefs = vi.fn();

  beforeEach(() => {
    vi.resetAllMocks();
    mockUseMutation.mockImplementation((ref: string) => {
      if (ref.includes("markRead")) return mockMarkRead;
      if (ref.includes("updatePreferences")) return mockUpdatePrefs;
      return vi.fn();
    });
  });

  afterEach(cleanup);

  it("renders loading state", async () => {
    mockUseQuery.mockReturnValue(undefined);

    const { NotificationsPage } = await import("./NotificationsPage");
    render(
      <MemoryRouter>
        <NotificationsPage leagueId={"league-1" as any} />
      </MemoryRouter>,
    );

    expect(screen.getByText(/loading/i)).toBeInTheDocument();
  });

  it("renders empty state when no notifications", async () => {
    mockUseQuery.mockImplementation((ref: string) => {
      if (typeof ref === "string" && ref.includes("getNotifications")) return [];
      if (typeof ref === "string" && ref.includes("getPreferences"))
        return { matchSchedule: true, scoreDeadline: true, rosterChange: true };
      return [];
    });

    const { NotificationsPage } = await import("./NotificationsPage");
    render(
      <MemoryRouter>
        <NotificationsPage leagueId={"league-1" as any} />
      </MemoryRouter>,
    );

    expect(screen.getByText(/no notifications/i)).toBeInTheDocument();
  });

  it("renders notification list", async () => {
    mockUseQuery.mockImplementation((ref: string) => {
      if (typeof ref === "string" && ref.includes("getNotifications"))
        return [
          {
            _id: "n1",
            category: "match_schedule",
            title: "Upcoming Match",
            message: "You play tomorrow at 7pm",
            isRead: false,
            createdAt: Date.now(),
          },
          {
            _id: "n2",
            category: "roster_change",
            title: "New Player Added",
            message: "Bob joined your team",
            isRead: true,
            createdAt: Date.now() - 60000,
          },
        ];
      if (typeof ref === "string" && ref.includes("getPreferences"))
        return { matchSchedule: true, scoreDeadline: true, rosterChange: true };
      return [];
    });

    const { NotificationsPage } = await import("./NotificationsPage");
    render(
      <MemoryRouter>
        <NotificationsPage leagueId={"league-1" as any} />
      </MemoryRouter>,
    );

    expect(screen.getByText("Upcoming Match")).toBeInTheDocument();
    expect(screen.getByText("New Player Added")).toBeInTheDocument();
  });

  it("calls markRead when toggling read status", async () => {
    const user = userEvent.setup();
    mockUseQuery.mockImplementation((ref: string) => {
      if (typeof ref === "string" && ref.includes("getNotifications"))
        return [
          {
            _id: "n1",
            category: "match_schedule",
            title: "Upcoming Match",
            message: "You play tomorrow",
            isRead: false,
            createdAt: Date.now(),
          },
        ];
      if (typeof ref === "string" && ref.includes("getPreferences"))
        return { matchSchedule: true, scoreDeadline: true, rosterChange: true };
      return [];
    });

    const { NotificationsPage } = await import("./NotificationsPage");
    render(
      <MemoryRouter>
        <NotificationsPage leagueId={"league-1" as any} />
      </MemoryRouter>,
    );

    const markReadBtn = screen.getByRole("button", { name: /mark as read/i });
    await user.click(markReadBtn);

    expect(mockMarkRead).toHaveBeenCalledWith({
      notificationId: "n1",
      isRead: true,
    });
  });

  it("renders unread notifications with visual distinction", async () => {
    mockUseQuery.mockImplementation((ref: string) => {
      if (typeof ref === "string" && ref.includes("getNotifications"))
        return [
          {
            _id: "n1",
            category: "match_schedule",
            title: "Unread One",
            message: "Message",
            isRead: false,
            createdAt: Date.now(),
          },
        ];
      if (typeof ref === "string" && ref.includes("getPreferences"))
        return { matchSchedule: true, scoreDeadline: true, rosterChange: true };
      return [];
    });

    const { NotificationsPage } = await import("./NotificationsPage");
    render(
      <MemoryRouter>
        <NotificationsPage leagueId={"league-1" as any} />
      </MemoryRouter>,
    );

    const item = screen.getByText("Unread One").closest("[data-unread]");
    expect(item).toHaveAttribute("data-unread", "true");
  });

  it("renders notification preferences section", async () => {
    mockUseQuery.mockImplementation((ref: string) => {
      if (typeof ref === "string" && ref.includes("getNotifications")) return [];
      if (typeof ref === "string" && ref.includes("getPreferences"))
        return { matchSchedule: true, scoreDeadline: false, rosterChange: true };
      return [];
    });

    const { NotificationsPage } = await import("./NotificationsPage");
    render(
      <MemoryRouter>
        <NotificationsPage leagueId={"league-1" as any} />
      </MemoryRouter>,
    );

    expect(screen.getByText(/preferences/i)).toBeInTheDocument();
  });

  it("calls updatePreferences when toggling a category", async () => {
    const user = userEvent.setup();
    mockUseQuery.mockImplementation((ref: string) => {
      if (typeof ref === "string" && ref.includes("getNotifications")) return [];
      if (typeof ref === "string" && ref.includes("getPreferences"))
        return { matchSchedule: true, scoreDeadline: true, rosterChange: true };
      return [];
    });

    const { NotificationsPage } = await import("./NotificationsPage");
    render(
      <MemoryRouter>
        <NotificationsPage leagueId={"league-1" as any} />
      </MemoryRouter>,
    );

    // Find the checkbox for score deadlines and toggle it
    const scoreDeadlineCheckbox = screen.getByRole("checkbox", {
      name: /score deadline/i,
    });
    await user.click(scoreDeadlineCheckbox);

    expect(mockUpdatePrefs).toHaveBeenCalledWith(
      expect.objectContaining({
        leagueId: "league-1",
        scoreDeadline: false,
      }),
    );
  });

  it("shows category badge on notifications", async () => {
    mockUseQuery.mockImplementation((ref: string) => {
      if (typeof ref === "string" && ref.includes("getNotifications"))
        return [
          {
            _id: "n1",
            category: "match_schedule",
            title: "Match Info",
            message: "Details",
            isRead: false,
            createdAt: Date.now(),
          },
        ];
      if (typeof ref === "string" && ref.includes("getPreferences"))
        return { matchSchedule: true, scoreDeadline: true, rosterChange: true };
      return [];
    });

    const { NotificationsPage } = await import("./NotificationsPage");
    render(
      <MemoryRouter>
        <NotificationsPage leagueId={"league-1" as any} />
      </MemoryRouter>,
    );

    expect(screen.getByText(/schedule/i)).toBeInTheDocument();
  });
});

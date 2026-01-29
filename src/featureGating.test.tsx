// ABOUTME: Tests that frontend feature gating shows UpgradePrompt for unpaid plans.
// ABOUTME: Validates each gated page renders upgrade message when canUse returns false.

import { render, screen, cleanup } from "@testing-library/react";
import { vi, describe, it, expect, afterEach } from "vitest";
import { MemoryRouter } from "react-router-dom";

const mockUsePlan = vi.fn();

vi.mock("./usePlan", () => ({
  usePlan: () => mockUsePlan(),
}));

vi.mock("convex/react", () => ({
  useQuery: vi.fn(() => undefined),
  useMutation: vi.fn(() => vi.fn()),
}));

vi.mock("../convex/_generated/api", () => ({
  api: {
    trends: { getTrendsMetadata: "t", getPlayerTrend: "t", getTeamTrend: "t" },
    statsExport: { getExportData: "t" },
    tournaments: { getTournaments: "t", createTournament: "t", getTournamentDetail: "t" },
    teams: { getTeams: "t" },
    auditLog: { getAuditLog: "t" },
    leagues: { getLeague: "t" },
    handicapConfig: { updateHandicapConfig: "t" },
    publicLeague: { toggleVisibility: "t" },
    subscriptions: { mySubscription: "t" },
  },
}));

vi.mock("recharts", () => ({
  LineChart: ({ children }: any) => <div>{children}</div>,
  Line: () => <div />,
  XAxis: () => <div />,
  YAxis: () => <div />,
  Tooltip: () => <div />,
  Legend: () => <div />,
  ResponsiveContainer: ({ children }: any) => <div>{children}</div>,
  CartesianGrid: () => <div />,
}));

import { HistoricalTrendsPage } from "./HistoricalTrendsPage";
import { PlayerStatsExportPage } from "./PlayerStatsExportPage";
import { CsvUploadPage } from "./CsvUploadPage";
import { ExcelUploadPage } from "./ExcelUploadPage";
import { TournamentPage } from "./TournamentPage";
import { AuditLogPage } from "./AuditLogPage";
import { HandicapConfigPage } from "./HandicapConfigPage";
import { LeagueVisibilityToggle } from "./LeagueVisibilityToggle";

afterEach(cleanup);

function starterPlan() {
  mockUsePlan.mockReturnValue({
    isLoading: false,
    canUse: () => false,
  });
}

function loadingPlan() {
  mockUsePlan.mockReturnValue({
    isLoading: true,
    canUse: () => false,
  });
}

function wrap(ui: React.ReactElement) {
  return render(<MemoryRouter>{ui}</MemoryRouter>);
}

const leagueId = "league1" as any;

describe("feature gating", () => {
  describe("shows UpgradePrompt on starter plan", () => {
    it("HistoricalTrendsPage", () => {
      starterPlan();
      wrap(<HistoricalTrendsPage leagueId={leagueId} />);
      expect(screen.getByText("Unlock Historical Trends")).toBeDefined();
      expect(screen.getByText("Upgrade to League")).toBeDefined();
    });

    it("PlayerStatsExportPage", () => {
      starterPlan();
      wrap(<PlayerStatsExportPage leagueId={leagueId} />);
      expect(screen.getByText("Unlock Stats Export")).toBeDefined();
    });

    it("CsvUploadPage", () => {
      starterPlan();
      wrap(<CsvUploadPage leagueId="league1" matchId="match1" />);
      expect(screen.getByText("Unlock Score Import")).toBeDefined();
    });

    it("ExcelUploadPage", () => {
      starterPlan();
      wrap(<ExcelUploadPage leagueId="league1" matchId="match1" />);
      expect(screen.getByText("Unlock Score Import")).toBeDefined();
    });

    it("TournamentPage", () => {
      starterPlan();
      wrap(<TournamentPage leagueId={leagueId} />);
      expect(screen.getByText("Unlock Tournaments")).toBeDefined();
    });

    it("AuditLogPage", () => {
      starterPlan();
      wrap(<AuditLogPage leagueId={leagueId} />);
      expect(screen.getByText("Unlock Audit Log")).toBeDefined();
    });

    it("HandicapConfigPage", () => {
      starterPlan();
      wrap(<HandicapConfigPage leagueId={leagueId} />);
      expect(screen.getByText("Unlock Full Handicapping")).toBeDefined();
    });

    it("LeagueVisibilityToggle", () => {
      starterPlan();
      wrap(<LeagueVisibilityToggle leagueId={leagueId} />);
      expect(screen.getByText("Unlock Public League Pages")).toBeDefined();
    });
  });

  describe("renders nothing while loading", () => {
    it("HistoricalTrendsPage", () => {
      loadingPlan();
      const { container } = wrap(<HistoricalTrendsPage leagueId={leagueId} />);
      expect(container.innerHTML).toBe("");
    });

    it("TournamentPage", () => {
      loadingPlan();
      const { container } = wrap(<TournamentPage leagueId={leagueId} />);
      expect(container.innerHTML).toBe("");
    });

    it("LeagueVisibilityToggle", () => {
      loadingPlan();
      const { container } = wrap(<LeagueVisibilityToggle leagueId={leagueId} />);
      expect(container.innerHTML).toBe("");
    });
  });
});

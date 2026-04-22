import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend } from "recharts";
import { format, parseISO } from "date-fns";
import { formatPoids } from "@/lib/poids-utils";

type Series = { key: string; label: string; color: string };
type Props = {
  data: Array<Record<string, string | number>>;
  series: Series[];
  height?: number;
};

export const PoidsLineChart = ({ data, series, height = 300 }: Props) => {
  return (
    <ResponsiveContainer width="100%" height={height}>
      <LineChart data={data} margin={{ top: 5, right: 12, left: 0, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
        <XAxis
          dataKey="date"
          tickFormatter={(v) => {
            try {
              return format(parseISO(v), "dd MMM");
            } catch {
              return v;
            }
          }}
          stroke="hsl(var(--muted-foreground))"
          fontSize={11}
          tickLine={false}
          axisLine={false}
        />
        <YAxis
          stroke="hsl(var(--muted-foreground))"
          fontSize={11}
          tickLine={false}
          axisLine={false}
          tickFormatter={(v) => formatPoids(Number(v))}
        />
        <Tooltip
          contentStyle={{
            backgroundColor: "hsl(var(--popover))",
            border: "1px solid hsl(var(--border))",
            borderRadius: "0.75rem",
            fontSize: "12px",
            boxShadow: "var(--shadow-lg)",
          }}
          labelFormatter={(v) => {
            try {
              return format(parseISO(String(v)), "dd MMM yyyy");
            } catch {
              return v;
            }
          }}
          formatter={(v: number) => [formatPoids(v) + " kg", ""]}
        />
        {series.length > 1 && <Legend wrapperStyle={{ fontSize: "12px" }} />}
        {series.map((s) => (
          <Line
            key={s.key}
            type="monotone"
            dataKey={s.key}
            name={s.label}
            stroke={s.color}
            strokeWidth={2.5}
            dot={false}
            activeDot={{ r: 5 }}
          />
        ))}
      </LineChart>
    </ResponsiveContainer>
  );
};

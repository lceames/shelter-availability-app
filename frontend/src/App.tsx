import React, { useEffect, useState } from "react";
import {
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    Paper,
    TableSortLabel,
    Select,
    MenuItem,
    FormControl,
    InputLabel,
    Box,
    Typography,
    CircularProgress,
} from "@mui/material";

const API_BASE_URL = "http://127.0.0.1:5000";

interface Shelter {
    name: string;
    address: string;
    postalCode: string;
    serviceType: string;
    capacityType: string;
    sector: string;
    availableBeds: number;
    totalBeds: number;
    availableRooms: number;
    totalRooms: number;
}

type FilterableKeys = keyof Pick<Shelter, "serviceType" | "capacityType" | "sector">;

const App: React.FC = () => {
    const [data, setData] = useState<Shelter[]>([]);
    const [loading, setLoading] = useState<boolean>(true);
    const [error, setError] = useState<string | null>(null);

    const [sortColumn, setSortColumn] = useState<keyof Shelter>("name");
    const [sortDirection, setSortDirection] = useState<"asc" | "desc">("asc");

    const [filterServiceType, setFilterServiceType] = useState<string>("");
    const [filterCapacityType, setFilterCapacityType] = useState<string>("");
    const [filterSector, setFilterSector] = useState<string>("");

    const uniqueValues = (field: FilterableKeys): string[] =>
        Array.from(new Set(data.map((item) => item[field])));

    const handleSort = (column: keyof Shelter) => {
        const isAsc = sortColumn === column && sortDirection === "asc";
        setSortDirection(isAsc ? "desc" : "asc");
        setSortColumn(column);
    };

    const filteredData = data.filter(
        (shelter) =>
            (!filterServiceType || shelter.serviceType === filterServiceType) &&
            (!filterCapacityType || shelter.capacityType === filterCapacityType) &&
            (!filterSector || shelter.sector === filterSector)
    );

    const sortedData = [...filteredData].sort((a, b) => {
        const valueA = a[sortColumn];
        const valueB = b[sortColumn];

        if (typeof valueA === "number" && typeof valueB === "number") {
            return sortDirection === "asc" ? valueA - valueB : valueB - valueA;
        }
        if (typeof valueA === "string" && typeof valueB === "string") {
            return sortDirection === "asc"
                ? valueA.localeCompare(valueB)
                : valueB.localeCompare(valueA);
        }
        return 0;
    });

    useEffect(() => {
        const fetchData = async () => {
            try {
                const response = await fetch(`${API_BASE_URL}/api/shelters`);
                if (!response.ok) {
                    throw new Error(`HTTP error! status: ${response.status}`);
                }
                const jsonData: Shelter[] = await response.json();
                setData(jsonData);
            } catch (err) {
                if (err instanceof Error) {
                    setError(err.message);
                } else {
                    setError("An unknown error occurred.");
                }
            } finally {
                setLoading(false);
            }
        };

        fetchData();
    }, []);

    if (loading) {
        return (
            <Box sx={{ textAlign: "center", mt: 4 }}>
                <CircularProgress />
            </Box>
        );
    }

    if (error) {
        return (
            <Box sx={{ textAlign: "center", mt: 4, color: "red" }}>
                <Typography variant="h6">Error: {error}</Typography>
            </Box>
        );
    }

    return (
        <Box sx={{ padding: "20px" }}>
            <Typography variant="h4" sx={{ mb: 3, fontWeight: "bold" }}>
                Toronto Shelter Availability
            </Typography>

            <Box sx={{ display: "flex", gap: "20px", mb: 3, flexWrap: "wrap" }}>
                <FormControl sx={{ minWidth: 200 }}>
                    <InputLabel>Service Type</InputLabel>
                    <Select
                        value={filterServiceType}
                        onChange={(e) => setFilterServiceType(e.target.value)}
                    >
                        <MenuItem value="">All</MenuItem>
                        {uniqueValues("serviceType").map((value) => (
                            <MenuItem key={value} value={value}>
                                {value}
                            </MenuItem>
                        ))}
                    </Select>
                </FormControl>
                <FormControl sx={{ minWidth: 200 }}>
                    <InputLabel>Capacity Type</InputLabel>
                    <Select
                        value={filterCapacityType}
                        onChange={(e) => setFilterCapacityType(e.target.value)}
                    >
                        <MenuItem value="">All</MenuItem>
                        {uniqueValues("capacityType").map((value) => (
                            <MenuItem key={value} value={value}>
                                {value}
                            </MenuItem>
                        ))}
                    </Select>
                </FormControl>
                <FormControl sx={{ minWidth: 200 }}>
                    <InputLabel>Sector</InputLabel>
                    <Select
                        value={filterSector}
                        onChange={(e) => setFilterSector(e.target.value)}
                    >
                        <MenuItem value="">All</MenuItem>
                        {uniqueValues("sector").map((value) => (
                            <MenuItem key={value} value={value}>
                                {value}
                            </MenuItem>
                        ))}
                    </Select>
                </FormControl>
            </Box>

            <TableContainer component={Paper}>
                <Table>
                    <TableHead>
                        <TableRow>
                            <TableCell>
                                <TableSortLabel
                                    active={sortColumn === "name"}
                                    direction={sortColumn === "name" ? sortDirection : "asc"}
                                    onClick={() => handleSort("name")}
                                >
                                    Name
                                </TableSortLabel>
                            </TableCell>
                            <TableCell>Address</TableCell>
                            <TableCell>Postal Code</TableCell>
                            <TableCell>
                                <TableSortLabel
                                    active={sortColumn === "availableBeds"}
                                    direction={sortColumn === "availableBeds" ? sortDirection : "asc"}
                                    onClick={() => handleSort("availableBeds")}
                                >
                                    Available Beds
                                </TableSortLabel>
                            </TableCell>
                            <TableCell>
                                <TableSortLabel
                                    active={sortColumn === "totalBeds"}
                                    direction={sortColumn === "totalBeds" ? sortDirection : "asc"}
                                    onClick={() => handleSort("totalBeds")}
                                >
                                    Total Beds
                                </TableSortLabel>
                            </TableCell>
                            <TableCell>
                                <TableSortLabel
                                    active={sortColumn === "availableRooms"}
                                    direction={sortColumn === "availableRooms" ? sortDirection : "asc"}
                                    onClick={() => handleSort("availableRooms")}
                                >
                                    Available Rooms
                                </TableSortLabel>
                            </TableCell>
                            <TableCell>
                                <TableSortLabel
                                    active={sortColumn === "totalRooms"}
                                    direction={sortColumn === "totalRooms" ? sortDirection : "asc"}
                                    onClick={() => handleSort("totalRooms")}
                                >
                                    Total Rooms
                                </TableSortLabel>
                            </TableCell>
                            <TableCell>Service Type</TableCell>
                            <TableCell>Capacity Type</TableCell>
                            <TableCell>Sector</TableCell>
                        </TableRow>
                    </TableHead>
                    <TableBody>
                        {sortedData.map((shelter, index) => (
                            <TableRow key={index}>
                                <TableCell>{shelter.name}</TableCell>
                                <TableCell>
                                    <a
                                        href={`https://maps.google.com/?q=${encodeURIComponent(
                                            shelter.address
                                        )}`}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                    >
                                        {shelter.address}
                                    </a>
                                </TableCell>
                                <TableCell>{shelter.postalCode}</TableCell>
                                <TableCell>{shelter.availableBeds}</TableCell>
                                <TableCell>{shelter.totalBeds}</TableCell>
                                <TableCell>{shelter.availableRooms}</TableCell>
                                <TableCell>{shelter.totalRooms}</TableCell>
                                <TableCell>{shelter.serviceType}</TableCell>
                                <TableCell>{shelter.capacityType}</TableCell>
                                <TableCell>{shelter.sector}</TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </TableContainer>
        </Box>
    );
};

export default App;
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

// Extracted function to render table rows
const renderTableRows = (shelters: Shelter[]) => {
return shelters.map((shelter, index) => (
        <TableRow key={index}>
            <TableCell>{shelter.name}</TableCell>
            <TableCell>
                <a href={`https://maps.google.com/?q=${encodeURIComponent(shelter.address)}`} target="_blank" rel="noopener noreferrer">
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
    ));
};

const App: React.FC = () => {
    const [data, setData] = useState<Shelter[]>([]);
    const [loading, setLoading] = useState<boolean>(true);
    const [error, setError] = useState<string | null>(null);

    const [sortColumn, setSortColumn] = useState<keyof Shelter>("name");
    const [sortDirection, setSortDirection] = useState<"asc" | "desc">("asc");

    const handleSort = (column: keyof Shelter) => {
        const isAsc = sortColumn === column && sortDirection === "asc";
        setSortDirection(isAsc ? "desc" : "asc");
        setSortColumn(column);
    };

    const sortedData = [...data].sort((a, b) => {
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
                const response = await fetch(`${API_BASE_URL}/api/shelters`); // Adjust path if necessary
                if (!response.ok) {
                    throw new Error(`HTTP error! status: ${response.status}`);
                }
                const jsonData: Shelter[] = await response.json();
                setData(jsonData);
            } catch (err: unknown) {
                // Narrow the type of 'err' to handle it appropriately
                if (err instanceof Error) {
                    setError(err.message);
                } else {
                    setError('An unknown error occurred.');
                }
            } finally {
                setLoading(false);
            }
        };

        fetchData();
    }, []);

    if (loading) {
        return <div>Loading...</div>;
    }

    if (error) {
        return <div>Error: {error}</div>;
    }

    return (
        <div style={{ padding: "20px" }}>
            <h1>Toronto Shelter Availability</h1>
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
                            <TableCell>
                                <TableSortLabel
                                    active={sortColumn === "serviceType"}
                                    direction={sortColumn === "serviceType" ? sortDirection : "asc"}
                                    onClick={() => handleSort("serviceType")}
                                >
                                    Service Type
                                </TableSortLabel>
                            </TableCell>
                            <TableCell>
                                <TableSortLabel
                                    active={sortColumn === "capacityType"}
                                    direction={sortColumn === "capacityType" ? sortDirection : "asc"}
                                    onClick={() => handleSort("capacityType")}
                                >
                                    Capacity Type
                                </TableSortLabel>
                            </TableCell>
                            <TableCell>
                                <TableSortLabel
                                    active={sortColumn === "sector"}
                                    direction={sortColumn === "sector" ? sortDirection : "asc"}
                                    onClick={() => handleSort("sector")}
                                >
                                    Sector
                                </TableSortLabel>
                            </TableCell>
                        </TableRow>
                    </TableHead>
                    <TableBody>{renderTableRows(sortedData)}</TableBody>
                </Table>
            </TableContainer>
        </div>
    );
};

export default App;
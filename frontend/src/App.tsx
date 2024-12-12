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
    TextField,
    Button,
    Autocomplete
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
    lat?: number;
    lng?: number;
}

interface PostalCode {
    longitude: number;
    latitude: number;
    code: string;
}

interface AppData {
    shelterAvailabilities: Shelter[];
    updateDate: string;
}

const defaultAppData: AppData = {
    shelterAvailabilities: [],
    updateDate: new Date().toISOString(),
};

const App: React.FC = () => {
    const [data, setData] = useState<AppData>(defaultAppData);
    const [userInput, setUserInput] = useState<string>("");
    const [selectedPostalCode, setSelectedPostalCode] = useState<string | null>(null);
    const [loading, setLoading] = useState<boolean>(true);
    const [error, setError] = useState<string | null>(null);

    const [sortColumn, setSortColumn] = useState<keyof Shelter>("name");
    const [sortDirection, setSortDirection] = useState<"asc" | "desc">("asc");

    const [filterServiceType, setFilterServiceType] = useState<string>("");
    const [filterCapacityType, setFilterCapacityType] = useState<string>("");
    const [filterSector, setFilterSector] = useState<string>("");
    const [userPostalCode, setUserPostalCode] = useState<string>("");
    const [distances, setDistances] = useState<Record<string, number>>({}); // Distance cache

    // Function to calculate distance using Haversine formula
    const calculateDistance = (
        lat1: number,
        lon1: number,
        lat2: number,
        lon2: number
    ): number => {
        const toRad = (value: number) => (value * Math.PI) / 180;
        const R = 6371; // Radius of Earth in kilometers
        const dLat = toRad(lat2 - lat1);
        const dLon = toRad(lon2 - lon1);
        const a =
            Math.sin(dLat / 2) * Math.sin(dLat / 2) +
            Math.cos(toRad(lat1)) *
                Math.cos(toRad(lat2)) *
                Math.sin(dLon / 2) *
                Math.sin(dLon / 2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        return R * c; // Distance in kilometers
    };

    const handleSort = (column: keyof Shelter) => {
        const isAsc = sortColumn === column && sortDirection === "asc";
        setSortDirection(isAsc ? "desc" : "asc");
        setSortColumn(column);
    };

    // const calculateDistances = (value: string | null) => {
    //     if (!value) return;

    //     const { latitude: userLat, longitude: userLon } = data.postalCodes[value];

    //     const updatedDistances: Record<string, number> = {};
    //     for (const shelter of data.shelterAvailabilities) {
    //         const { longitude: shelterLat, latitude: shelterLon } = data.postalCodes[shelter.postalCode.toLowerCase()];
    //         updatedDistances[shelter.postalCode] = calculateDistance(
    //             userLat,
    //             userLon,
    //             shelterLat,
    //             shelterLon
    //         );
    //     }
    //     setDistances(updatedDistances);
    // };

    const filteredData = data.shelterAvailabilities.filter(
        (shelter) =>
            (!filterServiceType || shelter.serviceType === filterServiceType) &&
            (!filterCapacityType || shelter.capacityType === filterCapacityType) &&
            (!filterSector || shelter.sector === filterSector)
    );

    const sortedData = [...filteredData].sort((a, b) => {
        if (selectedPostalCode) {
            const distanceA = distances[a.postalCode] || Infinity;
            const distanceB = distances[b.postalCode] || Infinity;
            return sortDirection === "asc" ? distanceA - distanceB : distanceB - distanceA;
        }

        const valueA = a[sortColumn as keyof Shelter];
        const valueB = b[sortColumn as keyof Shelter];

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

    const handleSearch = () => {
        if (selectedPostalCode) {
            setError(null);
            // Filter shelters based on selected postal code
            const filteredShelters = data.shelterAvailabilities.filter(
                (shelter) => shelter.postalCode === selectedPostalCode
            );
            console.log("Filtered shelters:", filteredShelters);
        } else {
            setError("Please select a valid postal code from the list.");
        }
    };

    // const handlePostalCodeSelection = (value: string | null) => {
    //     setSelectedPostalCode(value);
    //     calculateDistances(value);
    // };

    // // Filter options based on user input
    // const filteredOptions = Object.keys(data.postalCodes).filter((option) => {
    //     return option.toLowerCase().includes(userInput.toLowerCase());
    // });

    useEffect(() => {
        const fetchData = async () => {
            try {
                const response = await fetch(`${API_BASE_URL}/api/shelters`);
                if (!response.ok) {
                    throw new Error(`HTTP error! status: ${response.status}`);
                }
                const jsonData: AppData = await response.json();
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
                        {Array.from(new Set(data.shelterAvailabilities.map((s) => s.serviceType))).map((value) => (
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
                        {Array.from(new Set(data.shelterAvailabilities.map((s) => s.capacityType))).map((value) => (
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
                        {Array.from(new Set(data.shelterAvailabilities.map((s) => s.sector))).map((value) => (
                            <MenuItem key={value} value={value}>
                                {value}
                            </MenuItem>
                        ))}
                    </Select>
                </FormControl>
                {/* <Autocomplete
                    options={filteredOptions.length < 30 ? filteredOptions : []}
                    getOptionLabel={(option) => option}
                    inputValue={userInput} // Control input with `userInput`
                    onInputChange={(_, value) => setUserInput(value)} 
                    onChange={(_, value) => handlePostalCodeSelection(value)}
                    renderInput={(params) => (
                        <TextField
                            {...params}
                            label="Enter postal code"
                            variant="outlined"
                            error={!!error}
                            helperText={error}
                            fullWidth
                        />
                    )}
                    sx={{ minWidth: 200 }}
                    noOptionsText="No options available"
                /> */}
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
                            <TableCell>
                                <TableSortLabel
                                    active={sortColumn === "sector"}
                                    direction={sortColumn === "sector" ? sortDirection : "asc"}
                                    onClick={() => handleSort("sector")}
                                >
                                    Sector
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
                                    Service Type
                                </TableSortLabel>
                            </TableCell>
                        </TableRow>
                    </TableHead>
                    <TableBody>
                        {sortedData.map((shelter, index) => (
                            <TableRow key={index}>
                                <TableCell>{shelter.name}</TableCell>
                                <TableCell>{shelter.address}</TableCell>
                                <TableCell>{shelter.postalCode}</TableCell>
                                <TableCell>{shelter.availableBeds}</TableCell>
                                <TableCell>{shelter.totalBeds}</TableCell>
                                <TableCell>{shelter.availableRooms}</TableCell>
                                <TableCell>{shelter.totalRooms}</TableCell>
                                <TableCell>{shelter.sector}</TableCell>
                                <TableCell>{shelter.serviceType}</TableCell>
                                <TableCell>{shelter.capacityType}</TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </TableContainer>
            <Box sx={{ mt: 4 }}>
                <Typography variant="h5" sx={{ mb: 2, fontWeight: "bold" }}>
                    About Our Shelter Availability Tracker
                </Typography>
                <Typography variant="body1" sx={{ lineHeight: 1.8 }}>
                    Discover real-time information about shelters in Toronto with our comprehensive Shelter Availability Tracker. Designed to help individuals and families in need, this tool provides updated data on shelter capacity, including available beds and rooms. With filtering options for service type, capacity type, and sector, you can easily find the most suitable options near your location. Our distance-based sorting feature allows you to prioritize shelters closest to your postal code, making it convenient to find help when you need it most. Whether you're looking for emergency housing or specialized shelter services, our platform is here to support you.
                </Typography>
                <Typography variant="body1" sx={{ mt: 2, lineHeight: 1.8 }}>
                    Explore the best options for temporary housing and stay informed with accurate, real-time updates. This tool is ideal for individuals seeking shelter in Toronto and surrounding areas or organizations providing assistance to those in need.
                </Typography>
            </Box>
        </Box>
    );
};

export default App;
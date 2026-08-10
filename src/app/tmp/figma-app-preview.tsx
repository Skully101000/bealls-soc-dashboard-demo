import { useState, useEffect } from "react";
import { MapContainer, TileLayer, Marker, Circle as LeafletCircle, Polyline, useMap } from "react-leaflet";
import L from "leaflet";
import {
  Shield, Search, Bell, ChevronDown, LayoutDashboard, AlertTriangle,
  Star, TrendingUp, Eye, Radio, Volume2, BarChart2, Users, Settings,
  Activity, Clock, CheckCircle, Circle, Coffee, MapPin, UserPlus, Zap,
  Filter, RefreshCw, X, ChevronRight, Phone, Hash, Calendar,
  CloudRain, Flame, AlertOctagon, FileText, TrendingDown, CheckSquare,
  Plus, Mail, Building2, ShieldCheck, Siren, BookOpen, Server, Tv2, Map, FolderOpen,
} from "lucide-react";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  ResponsiveContainer, PieChart, Pie, Cell,
} from "recharts";

// ─── Types ────────────────────────────────────────────────────────────────────

type Severity = "critical" | "high" | "medium" | "low";
type OperatorStatus = "Available" | "Busy" | "Break";
type MyProfile = { name:string; extension:string; avatar:string; status:OperatorStatus; callsWatching:number; assignedStores:string[]; liveObservation:string[]; };
type CaseType = "SI Call" | "Other Call" | "Dataminr";

type Incident = { id: string; store: string; caseType: CaseType; time: string; respondedAt?: string; severity: Severity; assigned?: string; };
type Operator = { id: string; name: string; status: OperatorStatus; onStation: boolean; assignedStores: string[]; liveObservation: string[]; observations: number; avatar: string; extension: string; callsWatching: number; };
type DataminrAlert = { id: string; type: "shooting"|"weather"|"civil_unrest"|"fire"|"hazmat"|"power"|"traffic"; title: string; description: string; location: string; affectedStores: string[]; severity: Severity; time: string; source: string; };
type PAStore = { storeId: string; city: string; dateDown: string; daysDown: number; ticketNum: string; status: "Open"|"In Progress"|"Resolved"; assignedTech: string; };

interface StoreDetail {
  id: string; locationName: string; address: string; suite?: string; cityStateZip: string;
  phone: string; riskLevel: string; socMonitored: boolean; cctvInfo: string;
  shrinkDepts: { dept: string; amount: string }[];
  leadership: { regionalLPDirector: string; regionalLPPhone: string; districtLPManager: string; districtLPPhone: string; lpFieldInvestigator: string; opsRegionalDirector: string; opsDistrictManager: string; storeManager: string; };
  lawEnforcement: { agencyName: string; contactInfo: string; };
}

// ─── Store Detail Data ────────────────────────────────────────────────────────

const STORE_DETAILS: StoreDetail[] = [
  { id:"0042", locationName:"0042 - Bealls Miami FL", address:"8200 NW 27th Ave", suite:"Suite 100", cityStateZip:"Miami, FL 33147", phone:"305-693-4400", riskLevel:"Tier 1", socMonitored:true, cctvInfo:"Avigilon, 10.74.42.10", shrinkDepts:[{dept:"Women's Apparel",amount:"$3,200"},{dept:"Handbags",amount:"$2,850"},{dept:"Men's Apparel",amount:"$1,940"},{dept:"Footwear",amount:"$1,600"},{dept:"Accessories",amount:"$980"}], leadership:{regionalLPDirector:"J. Ochs",regionalLPPhone:"918-679-0618",districtLPManager:"R. Ridge",districtLPPhone:"469-822-2763",lpFieldInvestigator:"Wade Ashley",opsRegionalDirector:"M. Williams",opsDistrictManager:"S. Roberts",storeManager:"B. Gomez"}, lawEnforcement:{agencyName:"Miami PD",contactInfo:"305-603-6640"} },
  { id:"0087", locationName:"0087 - Bealls Ft. Lauderdale FL", address:"3200 N Federal Hwy", suite:"Suite 200", cityStateZip:"Ft. Lauderdale, FL 33306", phone:"954-565-8800", riskLevel:"Tier 2", socMonitored:true, cctvInfo:"Avigilon, 10.74.87.14", shrinkDepts:[{dept:"Women's Apparel",amount:"$2,100"},{dept:"Footwear",amount:"$1,750"},{dept:"Handbags",amount:"$1,400"},{dept:"Intimates",amount:"$980"},{dept:"Accessories",amount:"$640"}], leadership:{regionalLPDirector:"J. Ochs",regionalLPPhone:"918-679-0618",districtLPManager:"T. Stone",districtLPPhone:"469-833-1100",lpFieldInvestigator:"Carlos V.",opsRegionalDirector:"M. Williams",opsDistrictManager:"P. Harris",storeManager:"D. Brooks"}, lawEnforcement:{agencyName:"Ft. Lauderdale PD",contactInfo:"954-764-4357"} },
  { id:"0113", locationName:"0113 - Bealls West Palm FL", address:"1901 Palm Beach Lakes Blvd", cityStateZip:"West Palm Beach, FL 33409", phone:"561-688-7100", riskLevel:"Tier 2", socMonitored:true, cctvInfo:"Avigilon, 10.74.113.22", shrinkDepts:[{dept:"Women's Apparel",amount:"$1,890"},{dept:"Handbags",amount:"$1,560"},{dept:"Men's Apparel",amount:"$1,200"},{dept:"Footwear",amount:"$880"},{dept:"Accessories",amount:"$540"}], leadership:{regionalLPDirector:"J. Ochs",regionalLPPhone:"918-679-0618",districtLPManager:"K. Davis",districtLPPhone:"469-844-2200",lpFieldInvestigator:"Angela M.",opsRegionalDirector:"M. Williams",opsDistrictManager:"S. Roberts",storeManager:"T. Fletcher"}, lawEnforcement:{agencyName:"West Palm Beach PD",contactInfo:"561-822-1900"} },
  { id:"0156", locationName:"0156 - Bealls Orlando FL", address:"4200 Millenia Blvd", suite:"Suite 150", cityStateZip:"Orlando, FL 32839", phone:"407-351-6600", riskLevel:"Tier 2", socMonitored:true, cctvInfo:"Avigilon, 10.74.156.08", shrinkDepts:[{dept:"Women's Apparel",amount:"$2,400"},{dept:"Footwear",amount:"$2,100"},{dept:"Handbags",amount:"$1,700"},{dept:"Men's Apparel",amount:"$1,300"},{dept:"Kids",amount:"$750"}], leadership:{regionalLPDirector:"L. Marsh",regionalLPPhone:"918-680-1234",districtLPManager:"M. Torres",districtLPPhone:"469-855-3300",lpFieldInvestigator:"Brian C.",opsRegionalDirector:"R. Johnson",opsDistrictManager:"C. White",storeManager:"A. Garcia"}, lawEnforcement:{agencyName:"Orlando PD",contactInfo:"407-246-2470"} },
  { id:"0201", locationName:"0201 - Bealls Tampa FL", address:"3801 Henderson Blvd", cityStateZip:"Tampa, FL 33629", phone:"813-835-9900", riskLevel:"Tier 1", socMonitored:true, cctvInfo:"Avigilon, 10.74.201.31", shrinkDepts:[{dept:"Women's Apparel",amount:"$3,100"},{dept:"Handbags",amount:"$2,650"},{dept:"Footwear",amount:"$2,000"},{dept:"Men's Apparel",amount:"$1,450"},{dept:"Accessories",amount:"$900"}], leadership:{regionalLPDirector:"L. Marsh",regionalLPPhone:"918-680-1234",districtLPManager:"B. Harris",districtLPPhone:"469-866-4400",lpFieldInvestigator:"Sandra K.",opsRegionalDirector:"R. Johnson",opsDistrictManager:"D. Moore",storeManager:"P. Castillo"}, lawEnforcement:{agencyName:"Tampa PD",contactInfo:"813-231-6130"} },
  { id:"0234", locationName:"0234 - Bealls Jacksonville FL", address:"9501 Regency Square Blvd", cityStateZip:"Jacksonville, FL 32225", phone:"904-724-5500", riskLevel:"Tier 3", socMonitored:true, cctvInfo:"Avigilon, 10.74.234.45", shrinkDepts:[{dept:"Women's Apparel",amount:"$1,700"},{dept:"Footwear",amount:"$1,400"},{dept:"Men's Apparel",amount:"$1,050"},{dept:"Kids",amount:"$700"},{dept:"Accessories",amount:"$450"}], leadership:{regionalLPDirector:"L. Marsh",regionalLPPhone:"918-680-1234",districtLPManager:"P. Smith",districtLPPhone:"469-877-5500",lpFieldInvestigator:"James T.",opsRegionalDirector:"R. Johnson",opsDistrictManager:"N. Lewis",storeManager:"C. Anderson"}, lawEnforcement:{agencyName:"Jacksonville Sheriff's Office",contactInfo:"904-630-0500"} },
  { id:"0267", locationName:"0267 - Bealls Sarasota FL", address:"8201 S Tamiami Trail", cityStateZip:"Sarasota, FL 34238", phone:"941-966-7700", riskLevel:"Tier 2", socMonitored:true, cctvInfo:"Avigilon, 10.74.267.19", shrinkDepts:[{dept:"Women's Apparel",amount:"$1,950"},{dept:"Handbags",amount:"$1,600"},{dept:"Footwear",amount:"$1,250"},{dept:"Accessories",amount:"$800"},{dept:"Intimates",amount:"$520"}], leadership:{regionalLPDirector:"L. Marsh",regionalLPPhone:"918-680-1234",districtLPManager:"A. Wilson",districtLPPhone:"469-888-6600",lpFieldInvestigator:"Monica R.",opsRegionalDirector:"R. Johnson",opsDistrictManager:"D. Moore",storeManager:"K. Brown"}, lawEnforcement:{agencyName:"Sarasota PD",contactInfo:"941-954-7025"} },
  { id:"0289", locationName:"0289 - Bealls Fort Myers FL", address:"4125 Cleveland Ave", cityStateZip:"Fort Myers, FL 33901", phone:"239-939-4400", riskLevel:"Tier 3", socMonitored:true, cctvInfo:"Avigilon, 10.74.289.27", shrinkDepts:[{dept:"Women's Apparel",amount:"$1,400"},{dept:"Footwear",amount:"$1,100"},{dept:"Men's Apparel",amount:"$850"},{dept:"Kids",amount:"$580"},{dept:"Accessories",amount:"$380"}], leadership:{regionalLPDirector:"L. Marsh",regionalLPPhone:"918-680-1234",districtLPManager:"C. Martin",districtLPPhone:"469-899-7700",lpFieldInvestigator:"Derek W.",opsRegionalDirector:"R. Johnson",opsDistrictManager:"S. Roberts",storeManager:"L. Nguyen"}, lawEnforcement:{agencyName:"Fort Myers PD",contactInfo:"239-321-7700"} },
  { id:"0312", locationName:"0312 - Bealls Gainesville FL", address:"3601 SW Archer Rd", cityStateZip:"Gainesville, FL 32608", phone:"352-377-5300", riskLevel:"Tier 3", socMonitored:true, cctvInfo:"Avigilon, 10.74.312.33", shrinkDepts:[{dept:"Women's Apparel",amount:"$1,200"},{dept:"Men's Apparel",amount:"$980"},{dept:"Footwear",amount:"$820"},{dept:"Kids",amount:"$560"},{dept:"Accessories",amount:"$340"}], leadership:{regionalLPDirector:"F. Cross",regionalLPPhone:"918-681-2345",districtLPManager:"J. Reed",districtLPPhone:"469-800-8800",lpFieldInvestigator:"Tanya S.",opsRegionalDirector:"W. Clarke",opsDistrictManager:"B. Young",storeManager:"M. Patel"}, lawEnforcement:{agencyName:"Gainesville PD",contactInfo:"352-393-7500"} },
  { id:"0345", locationName:"0345 - Bealls Tallahassee FL", address:"2415 N Monroe St", cityStateZip:"Tallahassee, FL 32303", phone:"850-385-6600", riskLevel:"Tier 4", socMonitored:true, cctvInfo:"Avigilon, 10.74.345.41", shrinkDepts:[{dept:"Women's Apparel",amount:"$980"},{dept:"Footwear",amount:"$760"},{dept:"Men's Apparel",amount:"$640"},{dept:"Kids",amount:"$420"},{dept:"Accessories",amount:"$280"}], leadership:{regionalLPDirector:"F. Cross",regionalLPPhone:"918-681-2345",districtLPManager:"D. Clark",districtLPPhone:"469-811-9900",lpFieldInvestigator:"Paul N.",opsRegionalDirector:"W. Clarke",opsDistrictManager:"B. Young",storeManager:"A. Thompson"}, lawEnforcement:{agencyName:"Tallahassee PD",contactInfo:"850-891-4200"} },
  { id:"0378", locationName:"0378 - Bealls Pensacola FL", address:"6500 N Davis Hwy", cityStateZip:"Pensacola, FL 32504", phone:"850-477-8800", riskLevel:"Tier 4", socMonitored:true, cctvInfo:"Avigilon, 10.74.378.52", shrinkDepts:[{dept:"Women's Apparel",amount:"$880"},{dept:"Footwear",amount:"$700"},{dept:"Men's Apparel",amount:"$560"},{dept:"Kids",amount:"$380"},{dept:"Accessories",amount:"$240"}], leadership:{regionalLPDirector:"F. Cross",regionalLPPhone:"918-681-2345",districtLPManager:"S. Lee",districtLPPhone:"469-822-0011",lpFieldInvestigator:"Rita F.",opsRegionalDirector:"W. Clarke",opsDistrictManager:"T. Graham",storeManager:"C. Watts"}, lawEnforcement:{agencyName:"Pensacola PD",contactInfo:"850-435-1900"} },
  { id:"0401", locationName:"0401 - Bealls Daytona Beach FL", address:"1700 W International Speedway Blvd", cityStateZip:"Daytona Beach, FL 32114", phone:"386-258-9900", riskLevel:"Tier 1", socMonitored:true, cctvInfo:"Avigilon, 10.74.401.60", shrinkDepts:[{dept:"Women's Apparel",amount:"$2,800"},{dept:"Handbags",amount:"$2,200"},{dept:"Footwear",amount:"$1,850"},{dept:"Men's Apparel",amount:"$1,300"},{dept:"Accessories",amount:"$850"}], leadership:{regionalLPDirector:"J. Ochs",regionalLPPhone:"918-679-0618",districtLPManager:"N. White",districtLPPhone:"469-833-1122",lpFieldInvestigator:"Omar J.",opsRegionalDirector:"M. Williams",opsDistrictManager:"C. White",storeManager:"S. Evans"}, lawEnforcement:{agencyName:"Daytona Beach PD",contactInfo:"386-671-5100"} },
  // Opportunity Stores
  { id:"0055", locationName:"0055 - Bealls Ocala FL", address:"2700 SW College Rd", cityStateZip:"Ocala, FL 34471", phone:"352-854-3300", riskLevel:"Tier 3", socMonitored:true, cctvInfo:"Avigilon, 10.74.55.18", shrinkDepts:[{dept:"Women's Apparel",amount:"$1,240"},{dept:"Footwear",amount:"$920"},{dept:"Men's Apparel",amount:"$720"},{dept:"Kids",amount:"$480"},{dept:"Accessories",amount:"$310"}], leadership:{regionalLPDirector:"F. Cross",regionalLPPhone:"918-681-2345",districtLPManager:"J. Reed",districtLPPhone:"469-800-8800",lpFieldInvestigator:"Tanya S.",opsRegionalDirector:"W. Clarke",opsDistrictManager:"B. Young",storeManager:"H. Ramos"}, lawEnforcement:{agencyName:"Ocala PD",contactInfo:"352-369-7000"} },
  { id:"0099", locationName:"0099 - Bealls Clearwater FL", address:"2580 Gulf to Bay Blvd", cityStateZip:"Clearwater, FL 33759", phone:"727-796-4400", riskLevel:"Tier 3", socMonitored:true, cctvInfo:"Avigilon, 10.74.99.11", shrinkDepts:[{dept:"Women's Apparel",amount:"$980"},{dept:"Footwear",amount:"$780"},{dept:"Handbags",amount:"$660"},{dept:"Accessories",amount:"$440"},{dept:"Kids",amount:"$290"}], leadership:{regionalLPDirector:"L. Marsh",regionalLPPhone:"918-680-1234",districtLPManager:"B. Harris",districtLPPhone:"469-866-4400",lpFieldInvestigator:"Sandra K.",opsRegionalDirector:"R. Johnson",opsDistrictManager:"D. Moore",storeManager:"F. Santos"}, lawEnforcement:{agencyName:"Clearwater PD",contactInfo:"727-562-4242"} },
  { id:"0144", locationName:"0144 - Bealls Lakeland FL", address:"3800 US Hwy 98 N", cityStateZip:"Lakeland, FL 33809", phone:"863-858-5500", riskLevel:"Tier 2", socMonitored:true, cctvInfo:"Avigilon, 10.74.144.29", shrinkDepts:[{dept:"Women's Apparel",amount:"$2,100"},{dept:"Handbags",amount:"$1,640"},{dept:"Footwear",amount:"$1,280"},{dept:"Men's Apparel",amount:"$940"},{dept:"Accessories",amount:"$580"}], leadership:{regionalLPDirector:"L. Marsh",regionalLPPhone:"918-680-1234",districtLPManager:"M. Torres",districtLPPhone:"469-855-3300",lpFieldInvestigator:"Brian C.",opsRegionalDirector:"R. Johnson",opsDistrictManager:"C. White",storeManager:"T. Nguyen"}, lawEnforcement:{agencyName:"Lakeland PD",contactInfo:"863-834-6900"} },
  { id:"0188", locationName:"0188 - Bealls Naples FL", address:"6060 Collier Blvd", cityStateZip:"Naples, FL 34114", phone:"239-732-8800", riskLevel:"Tier 4", socMonitored:true, cctvInfo:"Avigilon, 10.74.188.37", shrinkDepts:[{dept:"Women's Apparel",amount:"$620"},{dept:"Footwear",amount:"$480"},{dept:"Accessories",amount:"$360"},{dept:"Men's Apparel",amount:"$280"},{dept:"Kids",amount:"$190"}], leadership:{regionalLPDirector:"L. Marsh",regionalLPPhone:"918-680-1234",districtLPManager:"C. Martin",districtLPPhone:"469-899-7700",lpFieldInvestigator:"Derek W.",opsRegionalDirector:"R. Johnson",opsDistrictManager:"S. Roberts",storeManager:"G. Perez"}, lawEnforcement:{agencyName:"Naples PD",contactInfo:"239-213-4844"} },
  { id:"0222", locationName:"0222 - Bealls Bradenton FL", address:"5810 14th St W", cityStateZip:"Bradenton, FL 34207", phone:"941-753-6600", riskLevel:"Tier 3", socMonitored:true, cctvInfo:"Avigilon, 10.74.222.44", shrinkDepts:[{dept:"Women's Apparel",amount:"$1,450"},{dept:"Footwear",amount:"$1,120"},{dept:"Handbags",amount:"$890"},{dept:"Men's Apparel",amount:"$640"},{dept:"Accessories",amount:"$420"}], leadership:{regionalLPDirector:"L. Marsh",regionalLPPhone:"918-680-1234",districtLPManager:"A. Wilson",districtLPPhone:"469-888-6600",lpFieldInvestigator:"Monica R.",opsRegionalDirector:"R. Johnson",opsDistrictManager:"D. Moore",storeManager:"R. Diaz"}, lawEnforcement:{agencyName:"Bradenton PD",contactInfo:"941-932-9300"} },
  { id:"0255", locationName:"0255 - Bealls Melbourne FL", address:"1700 W New Haven Ave", cityStateZip:"Melbourne, FL 32904", phone:"321-724-7700", riskLevel:"Tier 3", socMonitored:true, cctvInfo:"Avigilon, 10.74.255.51", shrinkDepts:[{dept:"Women's Apparel",amount:"$870"},{dept:"Footwear",amount:"$680"},{dept:"Men's Apparel",amount:"$520"},{dept:"Kids",amount:"$360"},{dept:"Accessories",amount:"$240"}], leadership:{regionalLPDirector:"F. Cross",regionalLPPhone:"918-681-2345",districtLPManager:"J. Reed",districtLPPhone:"469-800-8800",lpFieldInvestigator:"Tanya S.",opsRegionalDirector:"W. Clarke",opsDistrictManager:"B. Young",storeManager:"K. Williams"}, lawEnforcement:{agencyName:"Melbourne PD",contactInfo:"321-608-6731"} },
  { id:"0277", locationName:"0277 - Bealls St. Augustine FL", address:"2700 US-1 S", cityStateZip:"St. Augustine, FL 32086", phone:"904-794-5500", riskLevel:"Tier 4", socMonitored:true, cctvInfo:"Avigilon, 10.74.277.58", shrinkDepts:[{dept:"Women's Apparel",amount:"$430"},{dept:"Footwear",amount:"$340"},{dept:"Men's Apparel",amount:"$260"},{dept:"Kids",amount:"$180"},{dept:"Accessories",amount:"$120"}], leadership:{regionalLPDirector:"F. Cross",regionalLPPhone:"918-681-2345",districtLPManager:"P. Smith",districtLPPhone:"469-877-5500",lpFieldInvestigator:"James T.",opsRegionalDirector:"W. Clarke",opsDistrictManager:"N. Lewis",storeManager:"J. Hartley"}, lawEnforcement:{agencyName:"St. Johns County Sheriff",contactInfo:"904-824-8304"} },
  { id:"0300", locationName:"0300 - Bealls Panama City FL", address:"2410 US-98", cityStateZip:"Panama City, FL 32401", phone:"850-769-6600", riskLevel:"Tier 3", socMonitored:true, cctvInfo:"Avigilon, 10.74.300.62", shrinkDepts:[{dept:"Women's Apparel",amount:"$760"},{dept:"Footwear",amount:"$600"},{dept:"Men's Apparel",amount:"$460"},{dept:"Kids",amount:"$320"},{dept:"Accessories",amount:"$210"}], leadership:{regionalLPDirector:"F. Cross",regionalLPPhone:"918-681-2345",districtLPManager:"D. Clark",districtLPPhone:"469-811-9900",lpFieldInvestigator:"Paul N.",opsRegionalDirector:"W. Clarke",opsDistrictManager:"T. Graham",storeManager:"B. Larson"}, lawEnforcement:{agencyName:"Panama City PD",contactInfo:"850-872-3100"} },
  { id:"0333", locationName:"0333 - Bealls Key West FL", address:"3218 N Roosevelt Blvd", cityStateZip:"Key West, FL 33040", phone:"305-296-8800", riskLevel:"Tier 2", socMonitored:true, cctvInfo:"Avigilon, 10.74.333.70", shrinkDepts:[{dept:"Women's Apparel",amount:"$1,890"},{dept:"Handbags",amount:"$1,620"},{dept:"Footwear",amount:"$1,300"},{dept:"Accessories",amount:"$880"},{dept:"Men's Apparel",amount:"$680"}], leadership:{regionalLPDirector:"J. Ochs",regionalLPPhone:"918-679-0618",districtLPManager:"T. Stone",districtLPPhone:"469-833-1100",lpFieldInvestigator:"Carlos V.",opsRegionalDirector:"M. Williams",opsDistrictManager:"P. Harris",storeManager:"A. Monroe"}, lawEnforcement:{agencyName:"Key West PD",contactInfo:"305-293-6161"} },
  // Watch List Stores
  { id:"0410", locationName:"0410 - Bealls Kissimmee FL", address:"4970 US-192", cityStateZip:"Kissimmee, FL 34746", phone:"407-396-7700", riskLevel:"Tier 4", socMonitored:true, cctvInfo:"Avigilon, 10.74.410.15", shrinkDepts:[{dept:"Women's Apparel",amount:"$720"},{dept:"Footwear",amount:"$540"},{dept:"Kids",amount:"$400"},{dept:"Men's Apparel",amount:"$300"},{dept:"Accessories",amount:"$190"}], leadership:{regionalLPDirector:"L. Marsh",regionalLPPhone:"918-680-1234",districtLPManager:"M. Torres",districtLPPhone:"469-855-3300",lpFieldInvestigator:"Brian C.",opsRegionalDirector:"R. Johnson",opsDistrictManager:"C. White",storeManager:"D. Morales"}, lawEnforcement:{agencyName:"Kissimmee PD",contactInfo:"407-846-3333"} },
  { id:"0423", locationName:"0423 - Bealls Deltona FL", address:"1700 Deltona Blvd", cityStateZip:"Deltona, FL 32725", phone:"386-574-4400", riskLevel:"Tier 4", socMonitored:false, cctvInfo:"DVR, 10.74.423.22", shrinkDepts:[{dept:"Women's Apparel",amount:"$560"},{dept:"Footwear",amount:"$420"},{dept:"Kids",amount:"$310"},{dept:"Men's Apparel",amount:"$240"},{dept:"Accessories",amount:"$150"}], leadership:{regionalLPDirector:"L. Marsh",regionalLPPhone:"918-680-1234",districtLPManager:"M. Torres",districtLPPhone:"469-855-3300",lpFieldInvestigator:"Brian C.",opsRegionalDirector:"R. Johnson",opsDistrictManager:"C. White",storeManager:"P. Hines"}, lawEnforcement:{agencyName:"Volusia County Sheriff",contactInfo:"386-736-5961"} },
  { id:"0438", locationName:"0438 - Bealls Port St. Lucie FL", address:"1850 SW Gatlin Blvd", cityStateZip:"Port St. Lucie, FL 34953", phone:"772-878-6600", riskLevel:"Tier 3", socMonitored:true, cctvInfo:"Avigilon, 10.74.438.31", shrinkDepts:[{dept:"Women's Apparel",amount:"$910"},{dept:"Footwear",amount:"$680"},{dept:"Handbags",amount:"$530"},{dept:"Men's Apparel",amount:"$380"},{dept:"Accessories",amount:"$230"}], leadership:{regionalLPDirector:"J. Ochs",regionalLPPhone:"918-679-0618",districtLPManager:"K. Davis",districtLPPhone:"469-844-2200",lpFieldInvestigator:"Angela M.",opsRegionalDirector:"M. Williams",opsDistrictManager:"S. Roberts",storeManager:"T. Vega"}, lawEnforcement:{agencyName:"Port St. Lucie PD",contactInfo:"772-871-5001"} },
  { id:"0452", locationName:"0452 - Bealls Leesburg FL", address:"1400 N 14th St", cityStateZip:"Leesburg, FL 34748", phone:"352-728-5500", riskLevel:"Tier 4", socMonitored:false, cctvInfo:"DVR, 10.74.452.40", shrinkDepts:[{dept:"Women's Apparel",amount:"$480"},{dept:"Footwear",amount:"$360"},{dept:"Men's Apparel",amount:"$270"},{dept:"Kids",amount:"$190"},{dept:"Accessories",amount:"$120"}], leadership:{regionalLPDirector:"F. Cross",regionalLPPhone:"918-681-2345",districtLPManager:"J. Reed",districtLPPhone:"469-800-8800",lpFieldInvestigator:"Tanya S.",opsRegionalDirector:"W. Clarke",opsDistrictManager:"B. Young",storeManager:"C. Pham"}, lawEnforcement:{agencyName:"Leesburg PD",contactInfo:"352-787-2121"} },
  { id:"0467", locationName:"0467 - Bealls Vero Beach FL", address:"5905 20th St", cityStateZip:"Vero Beach, FL 32966", phone:"772-562-7700", riskLevel:"Tier 3", socMonitored:true, cctvInfo:"Avigilon, 10.74.467.48", shrinkDepts:[{dept:"Women's Apparel",amount:"$840"},{dept:"Footwear",amount:"$640"},{dept:"Handbags",amount:"$490"},{dept:"Accessories",amount:"$340"},{dept:"Men's Apparel",amount:"$240"}], leadership:{regionalLPDirector:"J. Ochs",regionalLPPhone:"918-679-0618",districtLPManager:"K. Davis",districtLPPhone:"469-844-2200",lpFieldInvestigator:"Angela M.",opsRegionalDirector:"M. Williams",opsDistrictManager:"S. Roberts",storeManager:"M. Okafor"}, lawEnforcement:{agencyName:"Vero Beach PD",contactInfo:"772-978-4600"} },
  { id:"0480", locationName:"0480 - Bealls Sebring FL", address:"3501 US-27 S", cityStateZip:"Sebring, FL 33870", phone:"863-382-4400", riskLevel:"Tier 4", socMonitored:false, cctvInfo:"DVR, 10.74.480.55", shrinkDepts:[{dept:"Women's Apparel",amount:"$390"},{dept:"Footwear",amount:"$290"},{dept:"Men's Apparel",amount:"$220"},{dept:"Kids",amount:"$160"},{dept:"Accessories",amount:"$100"}], leadership:{regionalLPDirector:"F. Cross",regionalLPPhone:"918-681-2345",districtLPManager:"D. Clark",districtLPPhone:"469-811-9900",lpFieldInvestigator:"Paul N.",opsRegionalDirector:"W. Clarke",opsDistrictManager:"T. Graham",storeManager:"J. Burrows"}, lawEnforcement:{agencyName:"Highlands County Sheriff",contactInfo:"863-402-7250"} },
  { id:"0494", locationName:"0494 - Bealls Ocala North FL", address:"3700 NW Blitchton Rd", cityStateZip:"Ocala, FL 34475", phone:"352-624-7700", riskLevel:"Tier 3", socMonitored:true, cctvInfo:"Avigilon, 10.74.494.63", shrinkDepts:[{dept:"Women's Apparel",amount:"$770"},{dept:"Footwear",amount:"$590"},{dept:"Men's Apparel",amount:"$440"},{dept:"Kids",amount:"$310"},{dept:"Accessories",amount:"$200"}], leadership:{regionalLPDirector:"F. Cross",regionalLPPhone:"918-681-2345",districtLPManager:"J. Reed",districtLPPhone:"469-800-8800",lpFieldInvestigator:"Tanya S.",opsRegionalDirector:"W. Clarke",opsDistrictManager:"B. Young",storeManager:"S. Tillman"}, lawEnforcement:{agencyName:"Marion County Sheriff",contactInfo:"352-732-8181"} },
];

// ─── Operational Data ─────────────────────────────────────────────────────────

const PRIORITY_STORE_DATA = [
  { id:"0042", city:"Miami",          region:"SE", lp:"R. Gomez",  alarms:3, cameras:16, status:"incident" as const },
  { id:"0087", city:"Ft. Lauderdale", region:"SE", lp:"T. Brooks", alarms:1, cameras:12, status:"monitoring" as const },
  { id:"0113", city:"West Palm",      region:"SE", lp:"K. Davis",  alarms:2, cameras:10, status:"monitoring" as const },
  { id:"0156", city:"Orlando",        region:"C",  lp:"M. Torres", alarms:1, cameras:14, status:"incident" as const },
  { id:"0201", city:"Tampa",          region:"W",  lp:"B. Harris", alarms:2, cameras:18, status:"incident" as const },
  { id:"0234", city:"Jacksonville",   region:"NE", lp:"P. Smith",  alarms:1, cameras:12, status:"monitoring" as const },
  { id:"0267", city:"Sarasota",       region:"W",  lp:"A. Wilson", alarms:1, cameras:10, status:"incident" as const },
  { id:"0289", city:"Fort Myers",     region:"SW", lp:"C. Martin", alarms:0, cameras:8,  status:"clear" as const },
  { id:"0312", city:"Gainesville",    region:"N",  lp:"J. Reed",   alarms:2, cameras:10, status:"monitoring" as const },
  { id:"0345", city:"Tallahassee",    region:"N",  lp:"D. Clark",  alarms:0, cameras:12, status:"clear" as const },
  { id:"0378", city:"Pensacola",      region:"NW", lp:"S. Lee",    alarms:0, cameras:8,  status:"clear" as const },
  { id:"0401", city:"Daytona Beach",  region:"NE", lp:"N. White",  alarms:3, cameras:0,  status:"incident" as const },
];

const OPPORTUNITY_STORE_DATA = [
  { id:"0055", city:"Ocala",         region:"N",  trend:"up" as const,   lossAmt:"$1,240", alarms:0 },
  { id:"0099", city:"Clearwater",    region:"W",  trend:"up" as const,   lossAmt:"$980",   alarms:0 },
  { id:"0144", city:"Lakeland",      region:"C",  trend:"up" as const,   lossAmt:"$2,100", alarms:1 },
  { id:"0188", city:"Naples",        region:"SW", trend:"down" as const, lossAmt:"$620",   alarms:0 },
  { id:"0222", city:"Bradenton",     region:"W",  trend:"up" as const,   lossAmt:"$1,450", alarms:0 },
  { id:"0255", city:"Melbourne",     region:"NE", trend:"up" as const,   lossAmt:"$870",   alarms:0 },
  { id:"0277", city:"St. Augustine", region:"NE", trend:"down" as const, lossAmt:"$430",   alarms:0 },
  { id:"0300", city:"Panama City",   region:"NW", trend:"up" as const,   lossAmt:"$760",   alarms:0 },
  { id:"0333", city:"Key West",      region:"SE", trend:"up" as const,   lossAmt:"$1,890", alarms:0 },
];

const WATCH_LIST_DATA = [
  { id:"0410", city:"Kissimmee",      region:"C",  reason:"New ORC activity flagged — 2 incidents past 30 days", tier:"Tier 4", socMonitored:true,  lastReview:"07/03/2026", flag:"Escalation Risk" },
  { id:"0423", city:"Deltona",        region:"NE", reason:"CCTV offline 3+ weeks, limited visibility",            tier:"Tier 4", socMonitored:false, lastReview:"07/01/2026", flag:"Camera Gap" },
  { id:"0438", city:"Port St. Lucie", region:"SE", reason:"LP coverage gap during summer staffing",              tier:"Tier 3", socMonitored:true,  lastReview:"07/05/2026", flag:"Staffing Gap" },
  { id:"0452", city:"Leesburg",       region:"N",  reason:"DVR system needs upgrade — footage gaps reported",     tier:"Tier 4", socMonitored:false, lastReview:"06/28/2026", flag:"Tech Risk" },
  { id:"0467", city:"Vero Beach",     region:"SE", reason:"Increased booster bag incidents noted by LP",          tier:"Tier 3", socMonitored:true,  lastReview:"07/04/2026", flag:"Escalation Risk" },
  { id:"0480", city:"Sebring",        region:"C",  reason:"No SOC monitoring — recommended for onboarding",       tier:"Tier 4", socMonitored:false, lastReview:"06/25/2026", flag:"SOC Gap" },
  { id:"0494", city:"Ocala North",    region:"N",  reason:"Seasonal foot traffic increase — heightened attention", tier:"Tier 3", socMonitored:true,  lastReview:"07/05/2026", flag:"Seasonal" },
];

const DEMO_CASE_FOLDER = "[Demo] Case folder — set your internal path when replacing sample data";

const BOLO_PEOPLE = [
  { id:"B001", caseId:"C-202601", label:"Unknown Male",   description:"6'1\" · ~200 lbs · Dark hoodie · Black cap",  lastStore:"0042", lastSeen:"14:12", date:"07/05/2026", photo:"https://images.unsplash.com/photo-1676195470090-7c90bf539b3b?w=160&h=200&fit=crop&auto=format", notes:"Demo sample — repeat visitor pattern across several stores.", filePath:DEMO_CASE_FOLDER },
  { id:"B002", caseId:"C-202602", label:"Unknown Female", description:"5'5\" · ~140 lbs · Gray jacket · Jeans",       lastStore:"0113", lastSeen:"13:58", date:"07/05/2026", photo:"https://images.unsplash.com/photo-1728232032054-1546e634f03c?w=160&h=200&fit=crop&auto=format", notes:"Demo sample — associated with C-202601; possible diversion role.", filePath:DEMO_CASE_FOLDER },
  { id:"B003", caseId:"C-202603", label:"Unknown Male",   description:"5'10\" · ~175 lbs · White tee · Blue cap",     lastStore:"0201", lastSeen:"13:44", date:"07/04/2026", photo:"https://images.unsplash.com/photo-1595644258096-683dfe70d88f?w=160&h=200&fit=crop&auto=format", notes:"Demo sample — possible concealment method noted.", filePath:DEMO_CASE_FOLDER },
  { id:"B004", caseId:"C-202604", label:"Unknown Male",   description:"6'0\" · ~190 lbs · Black jacket · Mask",       lastStore:"0267", lastSeen:"13:35", date:"07/04/2026", photo:"https://images.unsplash.com/photo-1742138104342-eee6ce6ed855?w=160&h=200&fit=crop&auto=format", notes:"Demo sample — high-priority; treat as do-not-approach for training.", filePath:DEMO_CASE_FOLDER },
  { id:"B005", caseId:"C-202605", label:"Unknown Male",   description:"5'8\" · ~160 lbs · Red shirt · Khakis",        lastStore:"0312", lastSeen:"13:20", date:"07/03/2026", photo:"https://images.unsplash.com/photo-1565538534766-87c0206acfef?w=160&h=200&fit=crop&auto=format", notes:"Demo sample — bag/boosting pattern in sample history.", filePath:DEMO_CASE_FOLDER },
  { id:"B006", caseId:"C-202606", label:"Unknown Female", description:"5'6\" · ~130 lbs · Purple top · Black pants",  lastStore:"0401", lastSeen:"13:10", date:"07/03/2026", photo:"https://images.unsplash.com/photo-1580559398448-41b11ce7e7d3?w=160&h=200&fit=crop&auto=format", notes:"Demo sample — distraction pattern; often works with a partner.", filePath:DEMO_CASE_FOLDER },
];

const DATAMINR_ALERTS: DataminrAlert[] = [
  { id:"DM001", type:"shooting",     title:"Active Shooter Report — Westfield Mall",        description:"Law enforcement responding to reports of shots fired at Westfield Mall, 0.4 miles from Store #0042. Shelter in place advisory issued.",      location:"Miami, FL",          affectedStores:["0042","0087"], severity:"critical", time:"14:18", source:"Miami-Dade PD Scanner" },
  { id:"DM002", type:"weather",      title:"Tropical Storm Warning — SE Florida Coast",      description:"National Weather Service issues tropical storm warning. Sustained winds 45–55 mph expected by 6 PM. Flash flood watches in effect.",          location:"Southeast Florida",  affectedStores:["0042","0087","0113"], severity:"high", time:"13:55", source:"NWS Miami" },
  { id:"DM003", type:"civil_unrest", title:"Large Protest — Downtown Orlando",               description:"Crowd estimated 2,000+ gathering near downtown Orlando. Police presence increased. Road closures on I-4 affecting store access.",             location:"Orlando, FL",        affectedStores:["0156"], severity:"medium", time:"13:40", source:"Orlando Sentinel" },
  { id:"DM004", type:"fire",         title:"Structure Fire — Adjacent Strip Mall",           description:"Fire department responding to structure fire in strip mall adjacent to Store #0312. Smoke visible. No evacuation order issued yet.",            location:"Gainesville, FL",    affectedStores:["0312"], severity:"high", time:"13:22", source:"Alachua County Fire Scanner" },
  { id:"DM005", type:"power",        title:"Widespread Power Outage — Sarasota County",      description:"FPL reporting major outage affecting 12,000 customers in Sarasota County. Estimated restoration 5+ hours.",                                   location:"Sarasota, FL",       affectedStores:["0267"], severity:"medium", time:"12:58", source:"FPL Outage Map" },
  { id:"DM006", type:"traffic",      title:"I-95 Major Accident — Multi-Hour Delay",         description:"Multi-vehicle accident on I-95 NB near exit 64. All lanes blocked. State Road 60 as alternate route.",                                       location:"Ft. Lauderdale, FL", affectedStores:["0087","0113"], severity:"low", time:"12:30", source:"FDOT Traffic" },
  { id:"DM007", type:"hazmat",       title:"Chemical Spill — Highway 19 Near Store #0201",   description:"HAZMAT team responding to tanker spill on US-19. Road closure within 0.5 miles of store. Air quality advisory for surrounding area.",         location:"Tampa, FL",          affectedStores:["0201"], severity:"high", time:"11:45", source:"Hillsborough County HAZMAT" },
];

type CamStore = { storeId: string; city: string; camerasDown: number; totalCameras: number; reason: string; dateDown: string; daysDown: number; ticketNum: string; status: "Open"|"In Progress"|"Resolved"; assignedTech: string; };
type NVRStore  = { storeId: string; city: string; nvrUnit: string; dateDown: string; daysDown: number; camerasAffected: number; ticketNum: string; status: "Open"|"In Progress"|"Resolved"; assignedTech: string; };

const CAM_DOWN_STORES: CamStore[] = [
  { storeId:"0401", city:"Daytona Beach",  camerasDown:16, totalCameras:16, reason:"Full NVR failure — all feeds lost",         dateDown:"07/05/2026", daysDown:0, ticketNum:"TKT-8830", status:"Open",        assignedTech:"IT Help Desk" },
  { storeId:"0042", city:"Miami",          camerasDown:4,  totalCameras:16, reason:"Cable damage — rear parking lot quad",      dateDown:"07/04/2026", daysDown:1, ticketNum:"TKT-8810", status:"In Progress", assignedTech:"R. Castillo" },
  { storeId:"0201", city:"Tampa",          camerasDown:3,  totalCameras:18, reason:"Power surge — fitting room zone",           dateDown:"07/03/2026", daysDown:2, ticketNum:"TKT-8788", status:"In Progress", assignedTech:"Mike V." },
  { storeId:"0267", city:"Sarasota",       camerasDown:2,  totalCameras:10, reason:"Lens obstruction reported by store LP",    dateDown:"07/02/2026", daysDown:3, ticketNum:"TKT-8762", status:"Open",        assignedTech:"Unassigned" },
  { storeId:"0312", city:"Gainesville",    camerasDown:1,  totalCameras:10, reason:"Network switch dropped — entrance cam",    dateDown:"07/01/2026", daysDown:4, ticketNum:"TKT-8741", status:"In Progress", assignedTech:"Sara L." },
  { storeId:"0087", city:"Ft. Lauderdale", camerasDown:2,  totalCameras:12, reason:"Vandalism — exterior cameras compromised", dateDown:"06/30/2026", daysDown:5, ticketNum:"TKT-8720", status:"Open",        assignedTech:"Unassigned" },
];

const NVR_DOWN_STORES: NVRStore[] = [
  { storeId:"0401", city:"Daytona Beach",  nvrUnit:"NVR-401-A", dateDown:"07/05/2026", daysDown:0,  camerasAffected:16, ticketNum:"TKT-8829", status:"Open",        assignedTech:"IT Help Desk" },
  { storeId:"0423", city:"Deltona",        nvrUnit:"DVR-423-A", dateDown:"06/28/2026", daysDown:7,  camerasAffected:8,  ticketNum:"TKT-8700", status:"In Progress", assignedTech:"Vendor" },
  { storeId:"0452", city:"Leesburg",       nvrUnit:"DVR-452-A", dateDown:"06/25/2026", daysDown:10, camerasAffected:6,  ticketNum:"TKT-8655", status:"Open",        assignedTech:"Unassigned" },
  { storeId:"0480", city:"Sebring",        nvrUnit:"DVR-480-A", dateDown:"06/20/2026", daysDown:15, camerasAffected:8,  ticketNum:"TKT-8610", status:"In Progress", assignedTech:"Vendor" },
];

const PA_DOWN_STORES: PAStore[] = [
  { storeId:"0156", city:"Orlando",        dateDown:"07/05/2026", daysDown:0,  ticketNum:"TKT-8821", status:"Open",        assignedTech:"IT Help Desk" },
  { storeId:"0201", city:"Tampa",          dateDown:"07/04/2026", daysDown:1,  ticketNum:"TKT-8799", status:"In Progress", assignedTech:"Mike V." },
  { storeId:"0312", city:"Gainesville",    dateDown:"07/01/2026", daysDown:4,  ticketNum:"TKT-8741", status:"In Progress", assignedTech:"Sara L." },
  { storeId:"0087", city:"Ft. Lauderdale", dateDown:"06/28/2026", daysDown:7,  ticketNum:"TKT-8692", status:"Open",        assignedTech:"Unassigned" },
  { storeId:"0333", city:"Key West",       dateDown:"06/25/2026", daysDown:10, ticketNum:"TKT-8644", status:"Resolved",    assignedTech:"Vendor" },
];

const INCIDENTS: Incident[] = [
  { id:"INC-001", store:"0042", caseType:"SI Call",    time:"14:32", respondedAt:"14:34", severity:"critical" },
  { id:"INC-002", store:"0087", caseType:"SI Call",    time:"14:28", respondedAt:"14:31", severity:"high" },
  { id:"INC-003", store:"0113", caseType:"Other Call", time:"14:21", respondedAt:"14:29", severity:"medium" },
  { id:"INC-004", store:"0156", caseType:"Other Call", time:"14:15", severity:"medium" },
  { id:"INC-005", store:"0201", caseType:"SI Call",    time:"14:08", respondedAt:"14:09", severity:"critical", assigned:"Marcus T." },
  { id:"INC-006", store:"0234", caseType:"Other Call", time:"14:02", severity:"high" },
  { id:"INC-007", store:"0267", caseType:"Dataminr",   time:"13:57", respondedAt:"14:01", severity:"critical" },
];

const OPERATORS: Operator[] = [
  { id:"op1",  name:"Marcus T.",  status:"Busy",      onStation:true,  assignedStores:["0042","0087","0055","0099","0113","0156","0144"],           liveObservation:["0042","0087","0055"],  observations:14, avatar:"MT", extension:"x2201", callsWatching:2 },
  { id:"op2",  name:"Sarah K.",   status:"Available", onStation:true,  assignedStores:["0201","0222","0267","0234","0188","0277","0300","0312"],    liveObservation:["0201","0267","0312"],  observations:8,  avatar:"SK", extension:"x2202", callsWatching:1 },
  { id:"op3",  name:"Devon R.",   status:"Break",     onStation:true,  assignedStores:["0345","0378","0333","0401","0410","0423","0438"],           liveObservation:["0345","0401","0438"],  observations:11, avatar:"DR", extension:"x2203", callsWatching:0 },
  { id:"op4",  name:"Priya N.",   status:"Available", onStation:true,  assignedStores:["0452","0467","0480","0494","0255","0289","0144","0099"],    liveObservation:["0452","0480","0289"],  observations:6,  avatar:"PN", extension:"x2204", callsWatching:0 },
  { id:"op5",  name:"James W.",   status:"Busy",      onStation:true,  assignedStores:["GA01","GA02","GA03","GA04","GA05","GA06","AL01"],           liveObservation:["GA01","GA02","GA04"],  observations:19, avatar:"JW", extension:"x2205", callsWatching:2 },
  { id:"op6",  name:"Lisa M.",    status:"Available", onStation:true,  assignedStores:["AL01","AL02","AL03","SC01","SC02","SC03","SC04"],           liveObservation:["AL01","SC01","SC02"],  observations:4,  avatar:"LM", extension:"x2206", callsWatching:1 },
  { id:"op7",  name:"Carlos R.",  status:"Available", onStation:true,  assignedStores:["NC01","NC02","NC03","NC04","NC05","TN01","TN02"],           liveObservation:["NC01","NC02","TN01"],  observations:7,  avatar:"CR", extension:"x2207", callsWatching:0 },
  { id:"op8",  name:"Tanya B.",   status:"Busy",      onStation:true,  assignedStores:["TN01","TN02","TN03","TN04","VA01","VA02","VA03"],           liveObservation:["TN02","VA01","VA02"],  observations:12, avatar:"TB", extension:"x2208", callsWatching:2 },
  { id:"op9",  name:"Jordan S.",  status:"Available", onStation:false, assignedStores:["MS01","MS02","MS03","LA01","LA02","LA03","AL02"],           liveObservation:["MS01","LA01","LA02"],  observations:5,  avatar:"JS", extension:"x2209", callsWatching:0 },
  { id:"op10", name:"Monique F.", status:"Break",     onStation:false, assignedStores:["TX01","TX02","TX03","TX04","OK01","OK02","AR01"],           liveObservation:["TX01","TX02","OK01"],  observations:9,  avatar:"MF", extension:"x2210", callsWatching:0 },
  { id:"op11", name:"Tyler H.",   status:"Available", onStation:true,  assignedStores:["0042","0055","0087","0099","0113","0144","0156"],           liveObservation:["0042","0099","0113"],  observations:3,  avatar:"TH", extension:"x2211", callsWatching:1 },
  { id:"op12", name:"Alexis W.",  status:"Busy",      onStation:true,  assignedStores:["0201","0234","0267","0277","0289","0300","0312"],           liveObservation:["0267","0289","0312"],  observations:16, avatar:"AW", extension:"x2212", callsWatching:2 },
  { id:"op13", name:"Dante M.",   status:"Available", onStation:true,  assignedStores:["0333","0345","0378","0401","0410","0423","0438"],           liveObservation:["0345","0410","0438"],  observations:6,  avatar:"DM", extension:"x2213", callsWatching:0 },
  { id:"op14", name:"Sierra V.",  status:"Break",     onStation:false, assignedStores:["0452","0467","0480","0494","0188","0222","0255"],           liveObservation:["0480","0467","0255"],  observations:8,  avatar:"SV", extension:"x2214", callsWatching:0 },
  { id:"op15", name:"Ray P.",     status:"Available", onStation:true,  assignedStores:["GA01","GA03","GA05","SC01","SC03","NC01","NC03"],           liveObservation:["GA01","SC01","NC01"],  observations:11, avatar:"RP", extension:"x2215", callsWatching:1 },
  { id:"op16", name:"Keisha D.",  status:"Busy",      onStation:true,  assignedStores:["NC02","NC04","TN01","TN03","VA01","MD01","KY01"],           liveObservation:["NC02","TN01","VA01"],  observations:13, avatar:"KD", extension:"x2216", callsWatching:2 },
  { id:"op17", name:"Brandon L.", status:"Available", onStation:false, assignedStores:["VA01","VA02","VA03","MD01","NC05","KY01","MO01"],           liveObservation:["VA02","MD01","MO01"],  observations:4,  avatar:"BL", extension:"x2217", callsWatching:0 },
  { id:"op18", name:"Nadia C.",   status:"Available", onStation:true,  assignedStores:["AR01","KY01","MO01","TN04","MS03","TX04","OK02"],           liveObservation:["AR01","KY01","MO01"],  observations:7,  avatar:"NC", extension:"x2218", callsWatching:0 },
  { id:"op19", name:"Felix O.",   status:"Break",     onStation:false, assignedStores:["TX01","TX03","TX04","OK01","OK02","LA03","AR01"],           liveObservation:["TX03","OK01","LA03"],  observations:2,  avatar:"FO", extension:"x2219", callsWatching:0 },
  { id:"op20", name:"Camille J.", status:"Available", onStation:true,  assignedStores:["SC02","SC03","SC04","NC04","NC05","GA05","GA06"],           liveObservation:["SC02","NC04","GA05"],  observations:9,  avatar:"CJ", extension:"x2220", callsWatching:1 },
];

const ACTIVITY = [
  { id:"a1", time:"14:34", event:"SI Call — suspicious individual",  store:"0042", type:"alarm" as const },
  { id:"a2", time:"14:32", event:"Marcus T. assigned to incident",   store:"0042", type:"assign" as const },
  { id:"a3", time:"14:29", event:"Camera feed restored",             store:"0099", type:"camera" as const },
  { id:"a4", time:"14:28", event:"SI Call — EAS tag activated",      store:"0087", type:"alarm" as const },
  { id:"a5", time:"14:25", event:"BOLO subject spotted on camera",   store:"0113", type:"bolo" as const },
  { id:"a6", time:"14:21", event:"Other Call — NVR issue",           store:"0113", type:"camera" as const },
  { id:"a7", time:"14:15", event:"Other Call — PA system failure",   store:"0156", type:"alarm" as const },
  { id:"a8", time:"14:09", event:"Incident resolved — clear",        store:"0188", type:"resolve" as const },
];

// ─── Store Map — Real Lat/Lon Coordinates ────────────────────────────────────
const STORE_LATLNG: Record<string,[number,number]> = {
  // ── Florida ───────────────────────────────────────────────────────────────
  "0042":[25.77,-80.19],"0087":[26.12,-80.14],"0113":[26.71,-80.05],
  "0156":[28.54,-81.38],"0201":[27.95,-82.46],"0234":[30.33,-81.66],
  "0267":[27.34,-82.53],"0289":[26.64,-81.87],"0312":[29.65,-82.33],
  "0345":[30.44,-84.28],"0378":[30.42,-87.22],"0401":[29.21,-81.02],
  "0055":[29.19,-82.14],"0099":[27.97,-82.80],"0144":[28.04,-81.95],
  "0188":[26.14,-81.80],"0222":[27.50,-82.57],"0255":[28.08,-80.61],
  "0277":[29.89,-81.32],"0300":[30.16,-85.66],"0333":[24.56,-81.78],
  "0410":[28.29,-81.41],"0423":[28.90,-81.26],"0438":[27.29,-80.35],
  "0452":[28.81,-81.88],"0467":[27.64,-80.40],"0480":[27.50,-81.45],
  "0494":[29.30,-82.15],
  // ── Georgia ───────────────────────────────────────────────────────────────
  "GA01":[33.75,-84.39],"GA02":[32.08,-81.09],"GA03":[31.20,-81.49],
  "GA04":[33.95,-83.38],"GA05":[32.54,-84.95],"GA06":[34.30,-83.83],
  "GA07":[33.03,-83.93],"GA08":[31.57,-84.16],"GA09":[34.73,-84.97],
  "GA10":[32.83,-83.65],"GA11":[31.15,-82.35],"GA12":[33.45,-82.01],
  "GA13":[34.50,-84.00],"GA14":[32.07,-83.23],"GA15":[31.55,-82.85],
  "GA16":[33.06,-84.23],"GA17":[31.42,-83.50],"GA18":[34.88,-84.32],
  "GA19":[32.45,-81.78],"GA20":[33.28,-84.96],"GA21":[34.17,-84.79],
  "GA22":[32.62,-83.99],"GA23":[31.93,-81.98],"GA24":[33.58,-82.08],
  "GA25":[34.74,-83.72],"GA26":[30.83,-83.28],"GA27":[33.08,-83.23],
  // ── Alabama ───────────────────────────────────────────────────────────────
  "AL01":[33.52,-86.80],"AL02":[32.36,-86.30],"AL03":[30.69,-88.04],
  "AL04":[34.73,-86.59],"AL05":[33.21,-87.57],"AL06":[31.31,-85.44],
  "AL07":[34.16,-86.84],"AL08":[32.84,-88.07],"AL09":[33.75,-87.68],
  "AL10":[34.36,-85.84],"AL11":[30.41,-87.68],"AL12":[31.85,-86.84],
  "AL13":[33.97,-86.08],"AL14":[34.80,-87.68],"AL15":[32.61,-85.49],
  "AL16":[33.66,-85.83],"AL17":[31.99,-87.26],"AL18":[32.47,-86.81],
  "AL19":[34.55,-86.98],"AL20":[30.25,-87.73],
  // ── South Carolina ────────────────────────────────────────────────────────
  "SC01":[34.00,-81.03],"SC02":[32.77,-79.93],"SC03":[33.84,-78.65],
  "SC04":[34.85,-82.39],"SC05":[33.49,-80.86],"SC06":[34.18,-79.83],
  "SC07":[33.67,-82.02],"SC08":[34.54,-82.65],"SC09":[33.35,-79.28],
  "SC10":[34.37,-80.07],"SC11":[33.92,-81.65],"SC12":[34.72,-82.84],
  "SC13":[34.94,-81.03],"SC14":[33.16,-80.00],"SC15":[34.68,-79.94],
  // ── North Carolina ────────────────────────────────────────────────────────
  "NC01":[35.23,-80.84],"NC02":[35.77,-78.64],"NC03":[36.07,-79.79],
  "NC04":[34.23,-77.95],"NC05":[35.38,-77.95],"NC06":[35.73,-81.69],
  "NC07":[36.10,-80.24],"NC08":[35.05,-78.88],"NC09":[35.52,-82.56],
  "NC10":[36.29,-76.22],"NC11":[35.60,-79.00],"NC12":[36.47,-79.72],
  "NC13":[35.95,-79.00],"NC14":[34.73,-76.91],"NC15":[35.42,-80.60],
  "NC16":[36.20,-81.67],"NC17":[35.19,-81.17],"NC18":[35.99,-78.90],
  "NC19":[35.48,-78.26],"NC20":[36.07,-77.03],
  // ── Tennessee ─────────────────────────────────────────────────────────────
  "TN01":[35.15,-90.05],"TN02":[36.17,-86.78],"TN03":[35.05,-85.31],
  "TN04":[35.96,-83.92],"TN05":[36.52,-82.53],"TN06":[35.61,-88.82],
  "TN07":[36.34,-89.57],"TN08":[35.83,-86.39],"TN09":[35.96,-84.10],
  "TN10":[36.54,-87.36],"TN11":[35.29,-89.01],"TN12":[35.48,-86.46],
  "TN13":[36.52,-84.49],"TN14":[35.76,-85.86],"TN15":[35.28,-86.20],
  "TN16":[36.16,-88.50],"TN17":[35.93,-83.55],"TN18":[36.33,-82.36],
  // ── Mississippi ───────────────────────────────────────────────────────────
  "MS01":[32.30,-90.18],"MS02":[30.36,-89.09],"MS03":[34.36,-89.52],
  "MS04":[32.64,-89.12],"MS05":[30.44,-88.89],"MS06":[31.33,-89.33],
  "MS07":[33.45,-88.82],"MS08":[32.35,-88.71],"MS09":[31.69,-90.45],
  "MS10":[33.89,-89.92],"MS11":[34.26,-88.71],"MS12":[30.37,-88.53],
  "MS13":[32.78,-90.04],"MS14":[31.03,-91.40],"MS15":[34.96,-89.97],
  // ── Texas ─────────────────────────────────────────────────────────────────
  "TX01":[29.76,-95.37],"TX02":[29.42,-98.49],"TX03":[32.78,-96.80],
  "TX04":[30.27,-97.74],"TX05":[26.21,-98.23],"TX06":[27.80,-97.40],
  "TX07":[31.55,-97.15],"TX08":[33.58,-101.87],"TX09":[31.77,-106.50],
  "TX10":[29.56,-95.66],"TX11":[30.08,-95.38],"TX12":[25.90,-97.50],
  "TX13":[32.45,-97.01],"TX14":[33.21,-97.13],"TX15":[30.52,-97.83],
  "TX16":[32.07,-96.35],"TX17":[29.90,-93.94],"TX18":[30.07,-94.13],
  "TX19":[32.35,-95.30],"TX20":[31.08,-97.36],"TX21":[28.70,-100.48],
  "TX22":[33.44,-94.05],"TX23":[30.70,-96.57],"TX24":[29.22,-99.78],
  "TX25":[32.53,-94.75],"TX26":[29.97,-95.69],"TX27":[30.46,-96.52],
  // ── Virginia ──────────────────────────────────────────────────────────────
  "VA01":[37.54,-77.43],"VA02":[36.85,-76.29],"VA03":[38.80,-77.05],
  "VA04":[37.27,-79.94],"VA05":[36.72,-76.60],"VA06":[37.40,-79.14],
  "VA07":[36.69,-77.44],"VA08":[37.09,-76.49],"VA09":[38.30,-77.46],
  "VA10":[37.78,-78.89],"VA11":[36.83,-75.98],
  // ── Louisiana ─────────────────────────────────────────────────────────────
  "LA01":[29.95,-90.07],"LA02":[30.45,-91.18],"LA03":[32.52,-92.12],
  "LA04":[30.22,-93.20],"LA05":[31.31,-92.45],"LA06":[30.22,-92.02],
  "LA07":[30.98,-91.96],"LA08":[29.61,-90.72],"LA09":[32.01,-93.75],
  "LA10":[29.18,-89.25],"LA11":[30.53,-92.41],"LA12":[32.51,-93.73],
  // ── Arkansas ──────────────────────────────────────────────────────────────
  "AR01":[34.75,-92.29],"AR02":[35.38,-94.40],"AR03":[35.85,-90.71],
  "AR04":[33.67,-91.82],"AR05":[34.47,-93.06],"AR06":[36.06,-94.16],
  "AR07":[35.08,-92.44],"AR08":[34.37,-93.56],"AR09":[35.29,-93.13],
  "AR10":[33.23,-91.78],"AR11":[36.34,-94.12],"AR12":[35.55,-91.41],
  "AR13":[34.55,-92.81],"AR14":[35.76,-91.64],
  // ── Kentucky ──────────────────────────────────────────────────────────────
  "KY01":[38.25,-85.76],"KY02":[37.99,-84.48],"KY03":[37.09,-88.59],
  "KY04":[36.87,-86.47],"KY05":[37.75,-87.11],"KY06":[38.77,-84.46],
  "KY07":[37.55,-84.29],"KY08":[37.14,-85.72],"KY09":[38.52,-82.67],
  "KY10":[37.81,-83.18],"KY11":[37.34,-83.83],"KY12":[36.72,-88.07],
  // ── Oklahoma ──────────────────────────────────────────────────────────────
  "OK01":[35.47,-97.52],"OK02":[36.15,-95.99],"OK03":[35.39,-99.40],
  "OK04":[34.60,-98.40],"OK05":[36.40,-97.88],"OK06":[35.67,-101.83],
  "OK07":[34.18,-97.14],"OK08":[35.73,-95.36],"OK09":[36.31,-94.88],
  "OK10":[35.18,-97.44],"OK11":[34.91,-95.76],
  // ── Missouri ──────────────────────────────────────────────────────────────
  "MO01":[38.63,-90.20],"MO02":[37.22,-93.29],"MO03":[36.64,-93.21],
  "MO04":[38.96,-92.33],"MO05":[39.10,-94.58],"MO06":[37.96,-91.77],
  "MO07":[36.90,-89.56],"MO08":[38.21,-92.44],"MO09":[37.50,-94.31],
  "MO10":[38.79,-94.88],"MO11":[37.07,-94.51],
  // ── Maryland & Delaware ───────────────────────────────────────────────────
  "MD01":[39.29,-76.61],"MD02":[38.97,-76.49],"MD03":[38.41,-75.55],
  "MD04":[39.65,-77.72],"MD05":[38.68,-75.98],
};

// ORC Interstate Corridors — projected escape/transit routes
// baseProb: baseline likelihood this route is used (adjusted by proximity)
const ORC_CORRIDORS = [
  {
    id:"I-95", name:"I-95 · East Coast", baseProb:92,
    desc:"Miami → Jax → Savannah → Richmond · Highest-volume ORC corridor in SE",
    color:"#F97316",
    coords:[
      [25.77,-80.19],[26.12,-80.14],[26.71,-80.05],[27.29,-80.35],[27.64,-80.40],
      [28.08,-80.61],[29.21,-81.02],[29.89,-81.32],[30.33,-81.66],[30.70,-81.47],
      [31.20,-81.40],[32.08,-81.09],[32.87,-79.97],[33.84,-78.65],[34.23,-77.95],
      [35.05,-78.88],[35.77,-78.64],[36.85,-76.29],[37.54,-77.43],[38.80,-77.05],
    ] as [number,number][],
  },
  {
    id:"I-75", name:"I-75 · West Coast / Interior", baseProb:88,
    desc:"Naples → Tampa → Atlanta → Chattanooga → Knoxville · Primary fencing corridor",
    color:"#3B82F6",
    coords:[
      [25.90,-80.43],[26.14,-81.80],[26.64,-81.87],[27.50,-82.57],[27.95,-82.46],
      [28.04,-81.95],[29.19,-82.14],[29.65,-82.33],[30.18,-82.65],[30.83,-82.28],
      [31.55,-83.60],[33.75,-84.39],[34.50,-84.00],[35.05,-85.31],[35.96,-83.92],
      [36.52,-82.53],[37.15,-84.09],[38.05,-84.50],
    ] as [number,number][],
  },
  {
    id:"I-10", name:"I-10 · Gulf Coast / Panhandle", baseProb:78,
    desc:"Jax → Tallahassee → Pensacola → Mobile → New Orleans → Houston",
    color:"#8B5CF6",
    coords:[
      [30.33,-81.66],[30.38,-82.60],[30.44,-84.28],[30.42,-86.20],[30.42,-87.22],
      [30.69,-88.04],[30.50,-89.09],[29.95,-90.07],[30.22,-93.20],[29.76,-95.37],
      [29.42,-98.49],[31.77,-106.50],
    ] as [number,number][],
  },
  {
    id:"I-85", name:"I-85 · Piedmont Corridor", baseProb:74,
    desc:"Atlanta → Charlotte → Raleigh-Durham · High-density retail strip, growing ORC",
    color:"#EC4899",
    coords:[
      [33.75,-84.39],[33.57,-85.07],[33.27,-85.80],[33.21,-87.57],[32.36,-86.30],
      [33.57,-85.07],[34.85,-82.39],[35.23,-80.84],[35.77,-78.64],[36.07,-79.79],
      [36.00,-78.90],
    ] as [number,number][],
  },
  {
    id:"I-20", name:"I-20 · Deep South", baseProb:71,
    desc:"Atlanta → Birmingham → Jackson → Dallas · Fence goods westward",
    color:"#10B981",
    coords:[
      [33.75,-84.39],[33.52,-86.80],[32.36,-86.30],[32.30,-90.18],[31.33,-89.33],
      [32.78,-96.80],[30.27,-97.74],
    ] as [number,number][],
  },
  {
    id:"I-40", name:"I-40 · Mid-South", baseProb:68,
    desc:"Memphis → Nashville → Knoxville → Asheville → Charlotte",
    color:"#EAB308",
    coords:[
      [35.15,-90.05],[35.61,-88.82],[35.83,-86.39],[36.17,-86.78],[35.96,-83.92],
      [35.96,-84.10],[35.52,-82.56],[35.05,-85.31],[35.73,-81.69],[35.23,-80.84],
    ] as [number,number][],
  },
  {
    id:"FL-TPK", name:"Florida Turnpike", baseProb:65,
    desc:"Miami → Orlando (toll) · Preferred for speed immediately after a hit",
    color:"#06B6D4",
    coords:[
      [25.77,-80.19],[26.12,-80.14],[26.71,-80.05],[27.64,-80.40],[28.08,-80.72],
      [28.29,-81.41],[28.54,-81.38],[28.84,-82.04],
    ] as [number,number][],
  },
  {
    id:"I-4", name:"I-4 · Central FL", baseProb:62,
    desc:"Tampa ↔ Daytona · Links west & east coasts through high-store density",
    color:"#F59E0B",
    coords:[
      [27.95,-82.46],[28.04,-81.95],[28.29,-81.41],[28.54,-81.38],[28.73,-81.14],
      [29.00,-81.02],[29.21,-81.02],
    ] as [number,number][],
  },
  {
    id:"I-75-ALY", name:"Alligator Alley (I-75)", baseProb:55,
    desc:"Naples ↔ Miami · Cross-Everglades post-hit escape route",
    color:"#14B8A6",
    coords:[
      [25.90,-80.43],[26.00,-81.05],[26.14,-81.80],
    ] as [number,number][],
  },
  {
    id:"I-26", name:"I-26 · Carolina Connector", baseProb:58,
    desc:"Columbia → Charleston → Asheville · Secondary SE distribution lane",
    color:"#A78BFA",
    coords:[
      [34.00,-81.03],[33.49,-80.86],[32.77,-79.93],[33.67,-82.02],[34.85,-82.39],
      [35.52,-82.56],
    ] as [number,number][],
  },
  {
    id:"I-275", name:"I-275 · Tampa Bay", baseProb:48,
    desc:"St. Pete / Clearwater ↔ Tampa · Local ORC redistribution loop",
    color:"#F472B6",
    coords:[
      [27.77,-82.64],[27.87,-82.68],[27.95,-82.46],[28.10,-82.44],
    ] as [number,number][],
  },
];

function distKm(a:[number,number], b:[number,number]): number {
  const R=6371, dL=(b[0]-a[0])*Math.PI/180, dN=(b[1]-a[1])*Math.PI/180;
  const x=Math.sin(dL/2)**2+Math.cos(a[0]*Math.PI/180)*Math.cos(b[0]*Math.PI/180)*Math.sin(dN/2)**2;
  return R*2*Math.atan2(Math.sqrt(x),Math.sqrt(1-x));
}

function MapFlyTo({pos}:{pos:[number,number]|null}) {
  const map = useMap();
  useEffect(()=>{ if(pos) map.flyTo(pos,10,{duration:1.5}); },[pos,map]);
  return null;
}

function createPinIcon(color:string, pulse=false, size=20): L.DivIcon {
  const ring = pulse
    ? `<circle cx="10" cy="10" r="10" fill="none" stroke="${color}" stroke-width="2" opacity="0.5"><animate attributeName="r" from="10" to="22" dur="1.5s" repeatCount="indefinite"/><animate attributeName="opacity" from="0.5" to="0" dur="1.5s" repeatCount="indefinite"/></circle>`
    : "";
  const h = Math.round(size * 1.35);
  return L.divIcon({
    html: `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${h}" viewBox="0 0 20 27" style="overflow:visible">${ring}<path d="M10,0 C4.5,0 0,4.5 0,10 C0,18 10,27 10,27 C10,27 20,18 20,10 C20,4.5 15.5,0 10,0 Z" fill="${color}" stroke="rgba(255,255,255,0.35)" stroke-width="0.8"/><circle cx="10" cy="10" r="3.5" fill="rgba(255,255,255,0.92)"/></svg>`,
    className: "",
    iconSize:   [size, h],
    iconAnchor: [size/2, h],
    popupAnchor:[0, -h],
  });
}

const NAV_ITEMS = [
  { icon: LayoutDashboard, label: "Dashboard",        id: "dashboard" },
  { icon: AlertTriangle,   label: "Active Incidents", id: "incidents", badge: 7 },
  { icon: Building2,       label: "Stores",           id: "stores" },
  { icon: BookOpen,        label: "Watch List",       id: "watchlist" },
  { icon: Map,             label: "Store Map",        id: "storemap" },
  { icon: Eye,             label: "BOLO",             id: "bolo" },
  { icon: Radio,           label: "Dataminr",         id: "dataminr", badge: 4 },
  { icon: Server,          label: "Systems Down",     id: "pa", badge: 4 },
  { icon: BarChart2,       label: "Reports",          id: "reports" },
  { icon: Users,           label: "Operators",        id: "operators" },
  { icon: Settings,        label: "Settings",         id: "settings" },
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

function sevCfg(s: Severity) {
  const m = {
    critical:{ bg:"bg-red-500/15",    text:"text-red-400",    border:"border-red-500/30",    dot:"bg-red-500",    label:"CRITICAL", badge:"bg-red-500/20 text-red-400" },
    high:    { bg:"bg-orange-500/15", text:"text-orange-400", border:"border-orange-500/30", dot:"bg-orange-500", label:"HIGH",     badge:"bg-orange-500/20 text-orange-400" },
    medium:  { bg:"bg-yellow-500/15", text:"text-yellow-400", border:"border-yellow-500/30", dot:"bg-yellow-500", label:"MEDIUM",   badge:"bg-yellow-500/20 text-yellow-400" },
    low:     { bg:"bg-blue-500/15",   text:"text-blue-400",   border:"border-blue-500/30",   dot:"bg-blue-500",   label:"LOW",      badge:"bg-blue-500/20 text-blue-400" },
  };
  return m[s];
}
function opCfg(s: OperatorStatus) {
  const m = { Available:{ color:"text-emerald-400", bg:"bg-emerald-500/15", dot:"bg-emerald-500", Icon:CheckCircle }, Busy:{ color:"text-red-400", bg:"bg-red-500/15", dot:"bg-red-500", Icon:Circle }, Break:{ color:"text-yellow-400", bg:"bg-yellow-500/15", dot:"bg-yellow-500", Icon:Coffee } };
  return m[s];
}
function actCfg(t: string) {
  const m: Record<string,{color:string;Icon:React.ElementType}> = { alarm:{color:"bg-red-500",Icon:AlertTriangle}, assign:{color:"bg-blue-500",Icon:UserPlus}, resolve:{color:"bg-emerald-500",Icon:CheckCircle}, camera:{color:"bg-purple-500",Icon:Eye}, bolo:{color:"bg-orange-500",Icon:Eye} };
  return m[t] ?? { color:"bg-slate-500", Icon:Activity };
}
function dmCfg(t: DataminrAlert["type"]) {
  const m: Record<string,{Icon:React.ElementType;color:string;bg:string}> = {
    shooting:    {Icon:AlertOctagon,color:"text-red-400",    bg:"bg-red-500/15"},
    weather:     {Icon:CloudRain,   color:"text-blue-400",   bg:"bg-blue-500/15"},
    civil_unrest:{Icon:Users,       color:"text-orange-400", bg:"bg-orange-500/15"},
    fire:        {Icon:Flame,       color:"text-orange-400", bg:"bg-orange-500/15"},
    hazmat:      {Icon:AlertTriangle,color:"text-yellow-400",bg:"bg-yellow-500/15"},
    power:       {Icon:Zap,         color:"text-yellow-400", bg:"bg-yellow-500/15"},
    traffic:     {Icon:TrendingDown,color:"text-slate-400",  bg:"bg-slate-500/15"},
  };
  return m[t] ?? { Icon:Radio, color:"text-blue-400", bg:"bg-blue-500/15" };
}
const CASE_TYPE_STYLE: Record<CaseType,{bg:string;text:string}> = {
  "SI Call":   {bg:"bg-red-500/15",   text:"text-red-400"},
  "Other Call":{bg:"bg-yellow-500/15",text:"text-yellow-400"},
  "Dataminr":  {bg:"bg-purple-500/15",text:"text-purple-400"},
};
const FLAG_STYLE: Record<string,{bg:string;text:string}> = {
  "Escalation Risk":{bg:"bg-red-500/15",    text:"text-red-400"},
  "Camera Gap":     {bg:"bg-purple-500/15", text:"text-purple-400"},
  "Staffing Gap":   {bg:"bg-orange-500/15", text:"text-orange-400"},
  "Tech Risk":      {bg:"bg-yellow-500/15", text:"text-yellow-400"},
  "SOC Gap":        {bg:"bg-slate-500/15",  text:"text-slate-400"},
  "Seasonal":       {bg:"bg-blue-500/15",   text:"text-blue-400"},
};

// ─── Shared Components ────────────────────────────────────────────────────────

function PageHeader({title,sub,action}:{title:string;sub?:string;action?:React.ReactNode}) {
  return (
    <div className="flex items-center justify-between mb-5">
      <div><h1 className="text-base font-bold text-foreground">{title}</h1>{sub&&<p className="text-[11px] text-muted-foreground mt-0.5">{sub}</p>}</div>
      {action}
    </div>
  );
}
function StatCard({label,value,sub,color,icon:Icon,alert}:{label:string;value:string|number;sub?:string;color:string;icon:React.ElementType;alert?:boolean}) {
  return (
    <div className={`rounded-2xl border bg-card p-4 flex flex-col gap-3 hover:border-blue-500/30 transition-all ${alert?"border-red-500/30":"border-border"}`}>
      <div className="flex items-center justify-between">
        <span className="text-[10px] font-bold tracking-widest text-muted-foreground uppercase">{label}</span>
        <div className={`w-8 h-8 rounded-xl flex items-center justify-center ${color}`}><Icon size={14}/></div>
      </div>
      <div>
        <span className={`text-2xl font-bold leading-none ${alert?"text-red-400":"text-foreground"}`}>{value}</span>
        {sub&&<p className="text-[11px] text-muted-foreground mt-1">{sub}</p>}
      </div>
    </div>
  );
}
function Chip({children,className=""}:{children:React.ReactNode;className?:string}) {
  return <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-semibold ${className}`}>{children}</span>;
}
function StoreTag({id,color}:{id:string;color:string}) {
  return <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-mono font-semibold ${color}`}><MapPin size={9}/>#{id}</span>;
}

// ─── Store Locator Panel ──────────────────────────────────────────────────────

function StoreLocatorPanel({storeId,onClose}:{storeId:string;onClose:()=>void}) {
  const d = STORE_DETAILS.find(s=>s.id===storeId);
  if (!d) return null;
  const riskColor = d.riskLevel==="Tier 1"?"text-red-400 bg-red-500/15":d.riskLevel==="Tier 2"?"text-orange-400 bg-orange-500/15":d.riskLevel==="Tier 3"?"text-yellow-400 bg-yellow-500/15":"text-emerald-400 bg-emerald-500/15";
  return (
    <div className="fixed inset-0 z-50 flex justify-end" style={{background:"rgba(0,0,0,0.55)"}} onClick={onClose}>
      <div className="w-full max-w-2xl h-full flex flex-col border-l border-border overflow-hidden" style={{background:"#0F172A"}} onClick={e=>e.stopPropagation()}>
        <div className="flex items-center justify-between px-6 py-5 border-b border-border shrink-0" style={{background:"#0B1120"}}>
          <div>
            <div className="flex items-center gap-2 mb-1">
              <Chip className={riskColor}><ShieldCheck size={10}/>{d.riskLevel}</Chip>
              <Chip className={d.socMonitored?"bg-emerald-500/15 text-emerald-400":"bg-yellow-500/15 text-yellow-400"}>{d.socMonitored?<><CheckCircle size={10}/>SOC Monitored</>:<><AlertTriangle size={10}/>Not Monitored</>}</Chip>
            </div>
            <h2 className="text-base font-bold text-foreground">{d.locationName}</h2>
          </div>
          <button onClick={onClose} className="w-8 h-8 rounded-lg flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors"><X size={16}/></button>
        </div>
        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="rounded-xl border border-border bg-card p-4">
              <div className="flex items-center gap-2 mb-3"><div className="w-6 h-6 rounded-lg bg-blue-500/20 flex items-center justify-center"><Building2 size={12} className="text-blue-400"/></div><p className="text-[11px] font-bold tracking-widest text-muted-foreground uppercase">Location Info</p></div>
              <div className="space-y-1.5 text-xs">
                <p className="text-foreground font-semibold">{d.address}{d.suite?`, ${d.suite}`:""}</p>
                <p className="text-foreground">{d.cityStateZip}</p>
                <div className="flex items-center gap-1.5 mt-2 pt-2 border-t border-border"><Phone size={11} className="text-blue-400"/><span className="text-blue-400 font-mono font-semibold">{d.phone}</span></div>
                <div className="flex items-center gap-1.5"><ShieldCheck size={11} className={d.riskLevel==="Tier 1"?"text-red-400":"text-yellow-400"}/><span className="text-foreground">Risk Level: <span className={`font-bold ${d.riskLevel==="Tier 1"?"text-red-400":d.riskLevel==="Tier 2"?"text-orange-400":"text-yellow-400"}`}>{d.riskLevel}</span></span></div>
                <div className="flex items-center gap-1.5"><Eye size={11} className={d.socMonitored?"text-emerald-400":"text-yellow-400"}/><span className="text-foreground">SOC Monitored: <span className={`font-bold ${d.socMonitored?"text-emerald-400":"text-yellow-400"}`}>{d.socMonitored?"Yes":"No"}</span></span></div>
                <div className="flex items-start gap-1.5"><Activity size={11} className="text-purple-400 mt-0.5 shrink-0"/><span className="text-foreground">CCTV: <span className="font-mono text-purple-400">{d.cctvInfo}</span></span></div>
              </div>
            </div>
            <div className="rounded-xl border border-red-500/20 bg-red-500/5 p-4">
              <div className="flex items-center gap-2 mb-3"><div className="w-6 h-6 rounded-lg bg-red-500/20 flex items-center justify-center"><Siren size={12} className="text-red-400"/></div><p className="text-[11px] font-bold tracking-widest text-red-400 uppercase">Law Enforcement Info</p></div>
              <div className="space-y-2 text-xs">
                <div><p className="text-muted-foreground text-[10px] uppercase tracking-widest font-semibold">Agency Name</p><p className="text-foreground font-bold text-sm mt-0.5">{d.lawEnforcement.agencyName}</p></div>
                <div><p className="text-muted-foreground text-[10px] uppercase tracking-widest font-semibold">Non-Emergency Contact</p><div className="flex items-center gap-2 mt-0.5"><Phone size={12} className="text-red-400"/><span className="font-mono font-bold text-red-400 text-sm">{d.lawEnforcement.contactInfo}</span></div></div>
                <button className="w-full flex items-center justify-center gap-2 py-2 mt-1 rounded-lg bg-red-500/20 hover:bg-red-500/30 text-red-400 border border-red-500/25 text-[11px] font-bold transition-colors"><Phone size={11}/>Call {d.lawEnforcement.agencyName}</button>
              </div>
            </div>
          </div>
          <div className="rounded-xl border border-border bg-card p-4">
            <div className="flex items-center gap-2 mb-3"><div className="w-6 h-6 rounded-lg bg-blue-500/20 flex items-center justify-center"><Users size={12} className="text-blue-400"/></div><p className="text-[11px] font-bold tracking-widest text-muted-foreground uppercase">Leadership Info</p></div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-2 text-xs">
              {[
                {label:"Regional LP Director",value:d.leadership.regionalLPDirector,phone:d.leadership.regionalLPPhone},
                {label:"District LP Manager", value:d.leadership.districtLPManager, phone:d.leadership.districtLPPhone},
                {label:"LP Field Investigator",value:d.leadership.lpFieldInvestigator},
                {label:"Ops Regional Director",value:d.leadership.opsRegionalDirector},
                {label:"Ops District Manager", value:d.leadership.opsDistrictManager},
                {label:"Store Manager",         value:d.leadership.storeManager},
              ].map(item=>(
                <div key={item.label} className="py-1.5 border-b border-border/50 last:border-0">
                  <p className="text-[10px] text-muted-foreground font-semibold underline">{item.label}</p>
                  <div className="flex items-center justify-between mt-0.5">
                    <span className="text-foreground font-medium">{item.value}</span>
                    {item.phone&&<span className="font-mono text-blue-400 text-[11px]">{item.phone}</span>}
                  </div>
                </div>
              ))}
            </div>
          </div>
          <div className="rounded-xl border border-border bg-card p-4">
            <div className="flex items-center gap-2 mb-3"><div className="w-6 h-6 rounded-lg bg-orange-500/20 flex items-center justify-center"><TrendingDown size={12} className="text-orange-400"/></div><p className="text-[11px] font-bold tracking-widest text-muted-foreground uppercase">Shrink Information</p></div>
            <div className="space-y-1">
              {d.shrinkDepts.map((dept,i)=>(
                <div key={i} className="flex items-center justify-between py-1.5 border-b border-border/40 last:border-0">
                  <div className="flex items-center gap-2"><span className="text-[10px] font-bold text-muted-foreground w-5">#{i+1}</span><span className="text-xs text-foreground">{dept.dept}</span></div>
                  <span className="text-xs font-mono font-bold text-orange-400">{dept.amount}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Incident Card ────────────────────────────────────────────────────────────

function IncidentCard({inc,onAssign}:{inc:Incident;onAssign:(id:string)=>void}) {
  const sc = sevCfg(inc.severity);
  const ct = CASE_TYPE_STYLE[inc.caseType];
  const [assigned,setAssigned] = useState(!!inc.assigned);
  return (
    <div className={`rounded-lg border ${sc.border} ${sc.bg} p-3 flex flex-col gap-2 hover:scale-[1.01] transition-transform`}>
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="flex items-center gap-1.5 mb-1 flex-wrap">
            <span className={`w-1.5 h-1.5 rounded-full ${sc.dot} shrink-0 ${inc.severity==="critical"?"animate-pulse":""}`}/>
            <span className={`text-[10px] font-bold tracking-widest ${sc.text}`}>{sc.label}</span>
            <Chip className={`${ct.bg} ${ct.text}`}>{inc.caseType}</Chip>
          </div>
          <p className="text-sm font-bold font-mono text-foreground">Store #{inc.store}</p>
        </div>
        <span className="text-[11px] font-mono text-muted-foreground shrink-0 pt-0.5">{inc.time}</span>
      </div>
      {inc.assigned&&<p className="text-[11px] text-blue-400 font-medium">→ {inc.assigned}</p>}
      <button onClick={()=>{setAssigned(true);onAssign(inc.id);}} className={`w-full flex items-center justify-center gap-1 py-1.5 rounded-md text-[11px] font-semibold transition-colors ${assigned?"bg-emerald-500/20 text-emerald-400 border border-emerald-500/30":"bg-blue-600 hover:bg-blue-500 text-white"}`}>
        <UserPlus size={10}/>{assigned?"Assigned":"Assign"}
      </button>
    </div>
  );
}

// ─── Operator Card ────────────────────────────────────────────────────────────

function OperatorCard({op, isMe}:{op:Operator; isMe?: boolean}) {
  const autoBusy = op.callsWatching >= 2;
  const effectiveStatus: OperatorStatus = autoBusy && op.status !== "Break" ? "Busy" : op.status;
  const sc = opCfg(effectiveStatus);
  const StatusIcon = sc.Icon;
  return (
    <div className={`rounded-2xl border p-5 flex flex-col gap-4 transition-all ${isMe ? "border-blue-500/30 bg-blue-500/5 hover:border-blue-500/50" : "border-border bg-card hover:border-blue-500/30"}`}>
      <div className="flex items-center gap-3">
        <div className={`w-10 h-10 rounded-full flex items-center justify-center text-xs font-bold text-white shrink-0 ${isMe ? "bg-gradient-to-br from-blue-500 to-blue-700" : "bg-gradient-to-br from-blue-600 to-blue-800"}`}>{op.avatar}</div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5">
            <p className="text-sm font-semibold text-foreground truncate">{op.name}</p>
            {isMe && <span className="text-[9px] font-bold bg-blue-500 text-white px-1 py-0.5 rounded shrink-0">YOU</span>}
          </div>
          <div className="flex items-center gap-2 mt-0.5 flex-wrap">
            <div className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md ${sc.bg}`}><StatusIcon size={10} className={sc.color}/><span className={`text-xs font-medium ${sc.color}`}>{effectiveStatus}</span></div>
            {autoBusy && <span className="text-[9px] font-bold text-red-400 bg-red-500/10 px-1.5 py-0.5 rounded">AUTO</span>}
            <span className="text-[11px] font-mono text-muted-foreground">{op.extension}</span>
          </div>
        </div>
        <div className="text-right shrink-0">
          <p className="text-lg font-bold text-foreground">{op.observations}</p>
          <p className="text-xs text-muted-foreground">obs.</p>
          {op.callsWatching > 0 && (
            <div className="flex items-center justify-end gap-1 mt-1">
              <Eye size={9} className={op.callsWatching >= 2 ? "text-red-400" : "text-muted-foreground"}/>
              <span className={`text-[9px] font-mono font-bold ${op.callsWatching >= 2 ? "text-red-400" : "text-muted-foreground"}`}>{op.callsWatching}</span>
            </div>
          )}
        </div>
      </div>
      <div className="space-y-3">
        <div>
          <div className="flex items-center justify-between mb-1.5">
            <div className="flex items-center gap-1.5">
              <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"/>
              <p className="text-[10px] font-bold text-emerald-400 uppercase tracking-wider">Live Obs</p>
            </div>
            <span className="text-[9px] font-mono text-muted-foreground">{op.liveObservation.length}/3</span>
          </div>
          <div className="flex flex-wrap gap-1">
            {op.liveObservation.length > 0
              ? op.liveObservation.map(s=><StoreTag key={s} id={s} color="bg-emerald-500/15 text-emerald-400 border border-emerald-500/25"/>)
              : <span className="text-[9px] text-muted-foreground italic">None selected</span>
            }
          </div>
        </div>
        <div>
          <div className="flex items-center justify-between mb-1.5">
            <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Assigned</p>
            <span className="text-[9px] font-mono text-muted-foreground">{op.assignedStores.length} stores</span>
          </div>
          <div className="flex flex-wrap gap-1">
            {op.assignedStores.map(s=>{
              const isLive = op.liveObservation.includes(s);
              return <StoreTag key={s} id={s} color={isLive ? "bg-emerald-500/10 text-emerald-500/60" : "bg-secondary/60 text-muted-foreground"}/>;
            })}
          </div>
        </div>
      </div>
      <button className="w-full flex items-center justify-center gap-2 py-2 rounded-lg text-xs font-semibold bg-blue-600/20 hover:bg-blue-600/30 text-blue-400 border border-blue-500/20 transition-colors"><UserPlus size={11}/>Assign Store</button>
    </div>
  );
}

// ─── My Status Card ───────────────────────────────────────────────────────────

function MyStatusCard() {
  const [onStation, setOnStation] = useState(false);
  const [status, setStatus]       = useState<OperatorStatus>("Available");
  const [calls, setCalls]         = useState(0);
  const [liveObs, setLiveObs]     = useState<string[]>([]);
  const [inputs, setInputs]       = useState<[string,string,string]>(["","",""]);

  const autoBusy        = calls >= 2 && status !== "Break";
  const effectiveStatus = autoBusy ? "Busy" : status;
  const sc              = opCfg(effectiveStatus);

  function setSlotInput(slot: number, val: string) {
    setInputs(prev => { const n = [...prev] as [string,string,string]; n[slot] = val.toUpperCase(); return n; });
  }

  function confirmSlot(slot: number) {
    const id = inputs[slot].trim();
    if (!id || liveObs.includes(id) || liveObs.length >= 3) return;
    setLiveObs(prev => [...prev, id]);
    setSlotInput(slot, "");
  }

  function removeLiveObs(id: string) {
    setLiveObs(prev => prev.filter(s => s !== id));
  }

  function handleGoOff() {
    setOnStation(false);
    setStatus("Available");
    setCalls(0);
    setLiveObs([]);
    setInputs(["","",""]);
  }

  return (
    <div className="rounded-2xl border border-border bg-card p-5">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <div className={`w-2 h-2 rounded-full ${onStation ? sc.dot : "bg-slate-600"}`}/>
          <h2 className="text-sm font-bold text-foreground uppercase tracking-wider">My Station</h2>
        </div>
        {onStation && autoBusy && (
          <span className="text-[10px] font-bold text-red-400 bg-red-500/10 px-2 py-0.5 rounded-full border border-red-500/20">
            AUTO-BUSY · {calls} calls active
          </span>
        )}
      </div>

      <div className="flex flex-col gap-4">
        <div className="flex items-center gap-4 flex-wrap">
          {/* Station toggle */}
          <button
            onClick={()=>{ onStation ? handleGoOff() : setOnStation(true); }}
            className={`flex items-center gap-3 px-5 py-3 rounded-xl font-bold text-sm transition-all border ${
              onStation
                ? "bg-emerald-500/15 border-emerald-500/40 text-emerald-400 hover:bg-emerald-500/25"
                : "bg-blue-600 border-blue-500 text-white hover:bg-blue-500 shadow-lg shadow-blue-900/30"
            }`}
          >
            <div className={`w-2.5 h-2.5 rounded-full ${onStation ? "bg-emerald-400 animate-pulse" : "bg-white/70"}`}/>
            {onStation ? "On Station" : "Go On Station"}
          </button>

          {/* Status pills + calls counter */}
          {onStation && (
            <div className="flex items-center gap-2 flex-wrap">
              {(["Available","Busy","Break"] as OperatorStatus[]).map(s => {
                const cfg    = opCfg(s);
                const Icon   = cfg.Icon;
                const active = effectiveStatus === s;
                const locked = autoBusy && s === "Busy";
                return (
                  <button
                    key={s}
                    onClick={()=>!locked && setStatus(s)}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all ${
                      active ? `${cfg.bg} ${cfg.color}` : "border-border text-muted-foreground hover:text-foreground hover:border-blue-500/30"
                    } ${locked ? "cursor-default" : ""}`}
                    style={active ? {borderColor: s==="Available"?"#10b981":s==="Busy"?"#ef4444":"#eab308"} : undefined}
                  >
                    <Icon size={11}/>{s}{locked && <span className="text-[8px] ml-0.5 opacity-70">(auto)</span>}
                  </button>
                );
              })}
              <div className="flex items-center gap-1.5 ml-2 pl-2 border-l border-border">
                <Eye size={12} className={calls >= 2 ? "text-red-400" : "text-muted-foreground"}/>
                <span className={`text-xs font-mono font-bold ${calls >= 2 ? "text-red-400" : "text-muted-foreground"}`}>{calls}</span>
                <span className="text-[10px] text-muted-foreground">calls</span>
                <button onClick={()=>setCalls(c=>Math.max(0,c-1))} disabled={calls===0} className="w-5 h-5 rounded flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-secondary disabled:opacity-30 transition-colors text-sm font-bold">−</button>
                <button onClick={()=>setCalls(c=>Math.min(5,c+1))} className="w-5 h-5 rounded flex items-center justify-center text-blue-400 hover:bg-blue-500/10 transition-colors text-sm font-bold">+</button>
              </div>
            </div>
          )}

          {!onStation && (
            <p className="text-xs text-muted-foreground">Click to join the active operator roster for this shift.</p>
          )}
        </div>

        {/* Live Observation slots — always visible */}
        <div className={`pt-3 border-t border-border ${!onStation ? "opacity-40 pointer-events-none" : ""}`}>
          <div className="flex items-center gap-2 mb-2">
            <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Live Observation</p>
            <span className="text-[10px] text-muted-foreground/50">{liveObs.length}/3 active</span>
            {!onStation && <span className="text-[10px] text-muted-foreground/50 italic">— go on station to edit</span>}
          </div>
          <div className="flex flex-col gap-1.5">
            {[0, 1, 2].map(slot => {
              const stored = liveObs[slot];
              return stored ? (
                /* Filled slot */
                <div key={slot} className="flex items-center gap-2 px-3 py-2 rounded-lg bg-secondary/40 border border-border">
                  <span className="text-[10px] text-muted-foreground/40 font-mono w-3 shrink-0">{slot + 1}</span>
                  <span className="flex-1 font-mono font-bold text-sm text-foreground">{stored}</span>
                  <button
                    onClick={() => removeLiveObs(stored)}
                    className="flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-semibold text-muted-foreground hover:text-red-400 hover:bg-red-500/10 border border-transparent hover:border-red-500/20 transition-colors"
                  >
                    <X size={10}/>Remove
                  </button>
                </div>
              ) : (
                /* Empty slot — always-active text input */
                <div key={slot} className="flex items-center gap-2 px-3 py-2 rounded-lg border border-dashed border-border/40 hover:border-border focus-within:border-blue-500/40 transition-colors bg-secondary/10">
                  <span className="text-[10px] text-muted-foreground/30 font-mono w-3 shrink-0">{slot + 1}</span>
                  <input
                    value={inputs[slot]}
                    onChange={e => setSlotInput(slot, e.target.value)}
                    onKeyDown={e => { if (e.key === "Enter") confirmSlot(slot); }}
                    placeholder="Store ID — press Enter to add"
                    maxLength={10}
                    className="flex-1 bg-transparent text-sm font-mono text-foreground placeholder:text-muted-foreground/25 focus:outline-none"
                  />
                  {inputs[slot].trim() && (
                    <button
                      onClick={() => confirmSlot(slot)}
                      className="px-2 py-0.5 rounded text-[10px] font-semibold text-blue-400 hover:bg-blue-500/10 border border-blue-500/20 transition-colors shrink-0"
                    >Add</button>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Dashboard ────────────────────────────────────────────────────────────────

function DashboardView({incidents,onAssign}:{incidents:Incident[];onAssign:(id:string)=>void}) {
  const incidentSet  = new Set(incidents.map(i=>i.store));
  const criticalSet  = new Set(incidents.filter(i=>i.severity==="critical").map(i=>i.store));
  const onStationOps = OPERATORS.filter(o=>o.onStation);
  const liveObsSet   = new Set(onStationOps.flatMap(o=>o.liveObservation));
  const [selectedOp, setSelectedOp] = useState<Operator|null>(null);

  function chunk<T>(arr: T[], n: number): T[][] {
    const out: T[][] = [];
    for (let i=0; i<arr.length; i+=n) out.push(arr.slice(i,i+n));
    return out;
  }

  // Two signals only: active incident = orange, live obs = brighter white. Everything else muted.
  function cellCls(id: string) {
    if (criticalSet.has(id) || incidentSet.has(id)) return "bg-orange-500/80 text-white font-bold";
    if (liveObsSet.has(id))  return "text-white font-bold";
    return "text-slate-500";
  }

  function StoreCell({id}:{id:string}) {
    return (
      <div className={`text-center font-mono text-[11px] py-0.5 px-1 border-r border-white/5 last:border-r-0 ${cellCls(id)}`}>
        {id}
      </div>
    );
  }

  const priorityIds    = PRIORITY_STORE_DATA.map(s=>s.id);
  const oppIds         = OPPORTUNITY_STORE_DATA.map(s=>s.id);
  const watchIds       = WATCH_LIST_DATA.map(s=>s.id);
  const rightGridIds   = [...oppIds, ...watchIds];

  return (
    <div className="space-y-2">

      {/* ── Top bar ── */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div>
            <span className="text-xs font-bold text-foreground tracking-wide">Bealls SOC</span>
            <span className="text-[11px] text-muted-foreground ml-2">
              {new Date().toLocaleDateString("en-US",{weekday:"short",month:"short",day:"numeric",year:"numeric"})}
            </span>
            <span className="font-mono text-[11px] text-blue-400 ml-1">
              {new Date().toLocaleTimeString("en-US",{hour:"2-digit",minute:"2-digit"})}
            </span>
          </div>
          {/* Tiny stat pills */}
          <div className="hidden md:flex items-center gap-1.5 ml-2">
            <span className={`flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-semibold border ${incidents.length>0?"text-orange-400 border-orange-500/20":"text-slate-500 border-border"}`}>
              <AlertTriangle size={9}/>{incidents.length} alarms
            </span>
            <span className="flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-semibold text-slate-500 border border-border">
              <Eye size={9}/>{BOLO_PEOPLE.length} BOLO
            </span>
            <span className="flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-semibold text-slate-500 border border-border">
              <Users size={9}/>{onStationOps.length} on station
            </span>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button className="flex items-center gap-1.5 px-3 py-1.5 rounded bg-blue-600 hover:bg-blue-500 text-white text-[11px] font-bold transition-colors">
            <Zap size={11}/>New Incident
          </button>
        </div>
      </div>

      {/* ── My Status ── */}
      <MyStatusCard/>

      {/* ── Priority + Opportunity store grids ── */}
      <div className="grid grid-cols-2 gap-2">

        {/* Priority */}
        <div className="border border-border overflow-hidden rounded-sm">
          <div className="bg-[#1a2535] text-slate-400 text-[10px] font-bold tracking-[0.2em] uppercase text-center py-1 border-b border-white/5">
            Priority
          </div>
          {chunk(priorityIds, 3).map((row,i)=>(
            <div key={i} className={`flex border-b border-white/5 last:border-b-0 ${i%2===0?"bg-card":"bg-[#151f30]"}`}>
              {row.map(id=><StoreCell key={id} id={id}/>)}
              {row.length < 3 && Array(3-row.length).fill(0).map((_,j)=>(
                <div key={j} className="flex-1 border-r border-white/5 last:border-r-0"/>
              ))}
            </div>
          ))}
        </div>

        {/* Opportunity + Watch List */}
        <div className="border border-border overflow-hidden rounded-sm">
          <div className="bg-[#1a2535] text-slate-400 text-[10px] font-bold tracking-[0.2em] uppercase text-center py-1 border-b border-white/5">
            Opportunity
          </div>
          {chunk(rightGridIds, 6).map((row,i)=>(
            <div key={i} className={`flex border-b border-white/5 last:border-b-0 ${i%2===0?"bg-card":"bg-[#151f30]"}`}>
              {row.map(id=><StoreCell key={id} id={id}/>)}
              {row.length < 6 && Array(6-row.length).fill(0).map((_,j)=>(
                <div key={j} className="flex-1 border-r border-white/5 last:border-r-0"/>
              ))}
            </div>
          ))}
        </div>

      </div>

      {/* ── Operator cards ── */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-1.5">
        {onStationOps.map(op=>{
          const sc     = opCfg(op.status);
          const half   = Math.ceil(op.assignedStores.length/2);
          const col1   = op.assignedStores.slice(0, half);
          const col2   = op.assignedStores.slice(half);
          const maxRows= Math.max(col1.length, col2.length);
          return (
            <div key={op.id} onClick={()=>setSelectedOp(op)} className="border border-border overflow-hidden rounded-sm text-[10px] font-mono cursor-pointer hover:border-slate-500/60 transition-colors">
              {/* Header */}
              <div className="flex items-center justify-between px-1.5 py-1 border-b border-white/5 bg-[#1a2535]">
                <span className="font-bold text-[9px] tracking-wide text-slate-400">{op.extension}</span>
                <span className="font-bold text-[9px] truncate ml-1 max-w-[80px] text-slate-300">{op.name}</span>
              </div>
              {/* Col headers */}
              <div className="flex border-b border-white/5">
                <div className="flex-1 text-center py-0.5 bg-card text-slate-500 text-[8px] font-bold border-r border-white/5 tracking-wider">Assigned</div>
                <div className="flex-1 text-center py-0.5 bg-card text-slate-500 text-[8px] font-bold tracking-wider">Assigned</div>
              </div>
              {/* Store rows */}
              {Array(maxRows).fill(0).map((_,r)=>(
                <div key={r} className={`flex border-b border-white/5 last:border-b-0 ${r%2===0?"bg-card":"bg-[#151f30]"}`}>
                  <div className={`flex-1 text-center py-0.5 border-r border-white/10 ${col1[r]?cellCls(col1[r]):""}`}>
                    {col1[r]||""}
                  </div>
                  <div className={`flex-1 text-center py-0.5 ${col2[r]?cellCls(col2[r]):""}`}>
                    {col2[r]||""}
                  </div>
                </div>
              ))}
              {/* Live Observation */}
              <div className="flex items-center gap-1 px-1.5 py-1 bg-card border-t border-white/5 flex-wrap">
                <span className="text-[8px] font-bold text-slate-500 uppercase tracking-widest shrink-0">Live</span>
                {op.liveObservation.length > 0
                  ? op.liveObservation.map(id=>(
                      <span key={id} className="text-white font-bold text-[9px] px-1 leading-tight border border-white/20 rounded-sm">{id}</span>
                    ))
                  : <span className="text-[8px] text-slate-600">—</span>
                }
              </div>
            </div>
          );
        })}
      </div>

      {/* ── BOLO strip ── */}
      <div className="border border-border rounded-sm overflow-hidden">
        <div className="flex items-center justify-between px-3 py-1.5 bg-[#1a2535] border-b border-white/5">
          <div className="flex items-center gap-1.5">
            <div className="w-1.5 h-1.5 rounded-full bg-orange-400 animate-pulse"/>
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Active BOLO</span>
          </div>
          <span className="text-[9px] text-slate-500">{BOLO_PEOPLE.length} subjects</span>
        </div>
        <div className="flex gap-2 p-2 overflow-x-auto">
          {BOLO_PEOPLE.map(p=>(
            <div key={p.id} className="shrink-0 w-24 border border-white/5 bg-card hover:border-orange-500/30 transition-colors cursor-pointer overflow-hidden rounded-sm">
              <div className="relative h-28 overflow-hidden">
                <img src={p.photo} alt={p.label} className="w-full h-full object-cover object-top" style={{filter:"grayscale(1) brightness(0.55)"}} onMouseEnter={e=>(e.currentTarget.style.filter="grayscale(0.3) brightness(0.8)")} onMouseLeave={e=>(e.currentTarget.style.filter="grayscale(1) brightness(0.55)")}/>
                {/* Case number badge — prominent */}
                <span className="absolute top-1 left-1 text-[8px] font-black bg-orange-500 text-white px-1.5 py-0.5 rounded-sm leading-tight">{p.caseId}</span>
              </div>
              <div className="px-1.5 py-1 space-y-0.5">
                <p className="text-[9px] text-slate-400 font-mono font-bold truncate">Store #{p.lastStore}</p>
                <p className="text-[8px] text-slate-600 truncate">{p.date} · {p.lastSeen}</p>
                {/* S-drive path — click to copy */}
                <button
                  onClick={e=>{ e.stopPropagation(); navigator.clipboard.writeText(p.filePath); }}
                  title={p.filePath}
                  className="flex items-center gap-1 px-1.5 py-0.5 rounded text-[8px] font-semibold bg-slate-700/60 hover:bg-orange-500/20 text-slate-400 hover:text-orange-400 border border-white/5 hover:border-orange-500/20 transition-colors w-full justify-center"
                >
                  <FolderOpen size={9} className="shrink-0"/>View in S Drive
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ── Operator popup modal ── */}
      {selectedOp && (() => {
        const op = selectedOp;
        const sc = opCfg(op.status);
        const Icon = sc.Icon;
        const activeIncidents = incidents.filter(i => op.assignedStores.includes(i.store));
        return (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={()=>setSelectedOp(null)}>
            <div className="absolute inset-0 bg-black/60 backdrop-blur-sm"/>
            <div className="relative bg-card border border-border rounded-2xl shadow-2xl w-full max-w-md" onClick={e=>e.stopPropagation()}>
              {/* Modal header */}
              <div className="flex items-center justify-between px-5 py-4 border-b border-border">
                <div className="flex items-center gap-3">
                  <div className={`w-9 h-9 rounded-full flex items-center justify-center text-sm font-black ${sc.bg} ${sc.color} border ${sc.border}`}>
                    {op.avatar}
                  </div>
                  <div>
                    <p className="text-sm font-bold text-foreground">{op.name}</p>
                    <p className="text-[11px] text-muted-foreground font-mono">{op.extension}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold border ${sc.bg} ${sc.color} ${sc.border}`}>
                    <Icon size={10}/>{op.status}
                  </span>
                  <button onClick={()=>setSelectedOp(null)} className="w-7 h-7 rounded-lg flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors">
                    <X size={14}/>
                  </button>
                </div>
              </div>

              <div className="p-5 space-y-4">
                {/* Stats row */}
                <div className="grid grid-cols-3 gap-2">
                  <div className="bg-secondary/30 rounded-xl p-3 text-center">
                    <p className="text-lg font-black text-foreground">{op.assignedStores.length}</p>
                    <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Assigned</p>
                  </div>
                  <div className="bg-secondary/30 rounded-xl p-3 text-center">
                    <p className="text-lg font-black text-white">{op.liveObservation.length}</p>
                    <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Live Obs</p>
                  </div>
                  <div className={`rounded-xl p-3 text-center ${activeIncidents.length > 0 ? "bg-orange-500/10" : "bg-secondary/30"}`}>
                    <p className={`text-lg font-black ${activeIncidents.length > 0 ? "text-orange-400" : "text-foreground"}`}>{activeIncidents.length}</p>
                    <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Incidents</p>
                  </div>
                </div>

                {/* Assigned stores */}
                <div>
                  <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-2">Assigned Stores</p>
                  <div className="flex flex-wrap gap-1.5">
                    {op.assignedStores.map(id => {
                      const hasInc = incidentSet.has(id);
                      const isLive = op.liveObservation.includes(id);
                      return (
                        <span key={id} className={`font-mono text-[11px] font-bold px-2 py-0.5 rounded border ${
                          hasInc ? "bg-orange-500/20 text-orange-400 border-orange-500/30" :
                          isLive ? "bg-white/5 text-white border-white/20" :
                          "bg-secondary/50 text-muted-foreground border-border"
                        }`}>{id}</span>
                      );
                    })}
                  </div>
                </div>

                {/* Live observation */}
                <div>
                  <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-2">Live Observation</p>
                  {op.liveObservation.length > 0 ? (
                    <div className="flex flex-wrap gap-1.5">
                      {op.liveObservation.map(id => (
                        <span key={id} className="font-mono text-[11px] font-bold px-2.5 py-1 rounded-lg border border-white/25 bg-white/5 text-white">
                          {id}
                        </span>
                      ))}
                    </div>
                  ) : (
                    <p className="text-[11px] text-muted-foreground/50 italic">No stores under live observation</p>
                  )}
                </div>

                {/* Active incidents on this operator's stores */}
                {activeIncidents.length > 0 && (
                  <div>
                    <p className="text-[10px] font-bold text-orange-400 uppercase tracking-widest mb-2">Active Incidents</p>
                    <div className="space-y-1">
                      {activeIncidents.map(inc => (
                        <div key={inc.id} className="flex items-center gap-2 px-3 py-2 rounded-lg bg-orange-500/10 border border-orange-500/20">
                          <AlertTriangle size={11} className="text-orange-400 shrink-0"/>
                          <span className="font-mono text-[11px] font-bold text-orange-300">{inc.store}</span>
                          <span className="text-[10px] text-orange-400/70 flex-1 truncate">{inc.description}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        );
      })()}

    </div>
  );
}

// ─── Incidents View ───────────────────────────────────────────────────────────

function useNow(intervalMs=30000) {
  const [now, setNow] = useState(()=>new Date());
  useEffect(()=>{ const t = setInterval(()=>setNow(new Date()), intervalMs); return ()=>clearInterval(t); },[intervalMs]);
  return now;
}

function elapsedMins(timeStr: string, now: Date): number {
  const [h,m] = timeStr.split(":").map(Number);
  const incident = new Date(now);
  incident.setHours(h, m, 0, 0);
  const diff = Math.floor((now.getTime() - incident.getTime()) / 60000);
  return diff < 0 ? diff + 1440 : diff; // handle midnight rollover
}

function parseTimeToMins(t: string) {
  const [h,m] = t.split(":").map(Number);
  return h * 60 + m;
}

function ResponseTimeBadge({callTime, respondedAt}:{callTime:string; respondedAt?:string}) {
  if (!respondedAt) {
    return (
      <span className="flex items-center gap-1 px-2 py-0.5 rounded-lg border border-slate-500/20 bg-slate-500/10 text-slate-400 text-[11px] font-mono font-bold">
        <Clock size={9}/>Pending
      </span>
    );
  }
  const mins = parseTimeToMins(respondedAt) - parseTimeToMins(callTime);
  const label = mins <= 0 ? "<1m" : mins < 60 ? `${mins}m` : `${Math.floor(mins/60)}h ${mins%60}m`;
  const cls = mins <= 2  ? "bg-emerald-500/15 text-emerald-400 border-emerald-500/20"
            : mins <= 5  ? "bg-yellow-500/15 text-yellow-400 border-yellow-500/20"
            :              "bg-red-500/15 text-red-400 border-red-500/20";
  return (
    <span className={`flex items-center gap-1 px-2 py-0.5 rounded-lg border text-[11px] font-mono font-bold ${cls}`}>
      <Clock size={9}/>{label}
    </span>
  );
}

function IncidentsView({incidents,onAssign}:{incidents:Incident[];onAssign:(id:string)=>void}) {
  const [caseFilter,setCaseFilter] = useState<CaseType|"all">("all");
  const [sevFilter,setSevFilter] = useState<Severity|"all">("all");
  const filtered = incidents.filter(i=>(sevFilter==="all"||i.severity===sevFilter)&&(caseFilter==="all"||i.caseType===caseFilter));
  return (
    <div>
      <PageHeader title="Active Incidents" sub={`${incidents.length} open · ${incidents.filter(i=>i.severity==="critical").length} critical`} action={<button className="flex items-center gap-2 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold transition-colors"><Plus size={13}/>Log Incident</button>}/>
      {/* Average response time banner */}
      {(() => {
        const responded = incidents.filter(i=>i.respondedAt);
        const avg = responded.length === 0 ? null
          : Math.round(responded.reduce((sum,i)=>sum + parseTimeToMins(i.respondedAt!) - parseTimeToMins(i.time), 0) / responded.length);
        const cls = avg === null ? "border-border bg-card text-muted-foreground"
          : avg <= 2 ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-400"
          : avg <= 5 ? "border-yellow-500/30 bg-yellow-500/10 text-yellow-400"
          :            "border-red-500/30 bg-red-500/10 text-red-400";
        return (
          <div className={`flex items-center gap-4 px-5 py-3 rounded-xl border mb-4 ${cls}`}>
            <Clock size={16} className="shrink-0"/>
            <div>
              <p className="text-[10px] font-bold uppercase tracking-widest opacity-70">Avg. Response Time — This Shift</p>
              <p className="text-2xl font-black leading-tight">
                {avg === null ? "—" : avg <= 0 ? "<1m" : `${avg}m`}
              </p>
            </div>
            <div className="ml-auto text-right">
              <p className="text-[10px] opacity-60">{responded.length} of {incidents.length} calls responded</p>
              <p className="text-[10px] opacity-60">{incidents.length - responded.length} pending</p>
            </div>
          </div>
        );
      })()}

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-5">
        {(["critical","high","medium","low"] as Severity[]).map(s=>{const sc=sevCfg(s);const count=incidents.filter(i=>i.severity===s).length;return(<div key={s} className={`rounded-xl border ${sc.border} ${sc.bg} p-3 cursor-pointer hover:opacity-90 transition-opacity`} onClick={()=>setSevFilter(sevFilter===s?"all":s)}><p className={`text-[10px] font-bold tracking-widest uppercase ${sc.text}`}>{sc.label}</p><p className={`text-2xl font-black leading-tight ${sc.text}`}>{count}</p></div>);})}
      </div>
      <div className="rounded-2xl border border-border bg-card overflow-hidden">
        <div className="flex items-center justify-between px-5 py-3 border-b border-border flex-wrap gap-2">
          <div className="flex items-center gap-2"><Activity size={14} className="text-red-400"/><span className="text-xs font-bold tracking-widest uppercase text-foreground">Incident Log</span></div>
          <div className="flex flex-wrap gap-1">
            <span className="text-[11px] text-muted-foreground self-center mr-1">Case Type:</span>
            {(["all","SI Call","Other Call","Dataminr"] as const).map(f=>(
              <button key={f} onClick={()=>setCaseFilter(f as CaseType|"all")} className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold capitalize transition-colors ${caseFilter===f?"bg-blue-600 text-white":"text-muted-foreground hover:text-foreground hover:bg-secondary"}`}>{f}</button>
            ))}
          </div>
        </div>
        <table className="w-full text-xs">
          <thead><tr className="border-b border-border">{["ID","Store","Case Type","Time","Response Time","Severity","Assigned","Action"].map(h=><th key={h} className="text-left px-4 py-3 text-[10px] font-bold tracking-widest text-muted-foreground uppercase whitespace-nowrap">{h}</th>)}</tr></thead>
          <tbody>
            {filtered.map((inc,i)=>{const sc=sevCfg(inc.severity);const ct=CASE_TYPE_STYLE[inc.caseType];return(
              <tr key={inc.id} className={`border-b border-border/50 hover:bg-blue-500/5 transition-colors ${i%2===0?"":"bg-white/[0.02]"}`}>
                <td className="px-4 py-3 font-mono text-muted-foreground">{inc.id}</td>
                <td className="px-4 py-3 font-mono font-bold text-foreground">#{inc.store}</td>
                <td className="px-4 py-3"><Chip className={`${ct.bg} ${ct.text}`}>{inc.caseType}</Chip></td>
                <td className="px-4 py-3 font-mono text-muted-foreground">{inc.time}</td>
                <td className="px-4 py-3"><ResponseTimeBadge callTime={inc.time} respondedAt={inc.respondedAt}/></td>
                <td className="px-4 py-3"><Chip className={sc.badge}><span className={`w-1 h-1 rounded-full ${sc.dot}`}/>{sc.label}</Chip></td>
                <td className="px-4 py-3">{inc.assigned?<span className="text-blue-400">{inc.assigned}</span>:<span className="text-muted-foreground">Unassigned</span>}</td>
                <td className="px-4 py-3"><div className="flex gap-1.5"><button onClick={()=>onAssign(inc.id)} className="px-2.5 py-1 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-[11px] font-semibold transition-colors">Assign</button><button className="px-2.5 py-1 rounded-lg bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-400 text-[11px] font-semibold border border-emerald-500/20 transition-colors">Resolve</button></div></td>
              </tr>
            );})}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ─── Stores View ─────────────────────────────────────────────────────────────

function StoresView() {
  const [tab,setTab] = useState<"priority"|"opportunity">("priority");
  const [selectedStore,setSelectedStore] = useState<string|null>(null);
  const [search, setSearch] = useState("");

  const allStoreIds = Object.keys(STORE_LATLNG);
  const onStationOps = OPERATORS.filter(o=>o.onStation);
  const liveSet     = new Set(onStationOps.flatMap(o=>o.liveObservation));
  const assignedSet = new Set(onStationOps.flatMap(o=>o.assignedStores));

  // Map storeId → operator info
  const liveOpFor: Record<string,Operator[]>     = {};
  const assignedOpFor: Record<string,Operator[]> = {};
  onStationOps.forEach(op=>{
    op.liveObservation.forEach(id=>{ liveOpFor[id]     = [...(liveOpFor[id]||[]), op]; });
    op.assignedStores.forEach(id=>{  assignedOpFor[id] = [...(assignedOpFor[id]||[]), op]; });
  });

  const cityOf = (id:string) =>
    PRIORITY_STORE_DATA.find(s=>s.id===id)?.city ||
    OPPORTUNITY_STORE_DATA.find(s=>s.id===id)?.city || "";

  const filteredAll = allStoreIds.filter(id=>{
    const q = search.toLowerCase();
    if (!q) return true;
    return id.toLowerCase().includes(q) || cityOf(id).toLowerCase().includes(q);
  });

  return (
    <>
      {selectedStore&&<StoreLocatorPanel storeId={selectedStore} onClose={()=>setSelectedStore(null)}/>}
      <div>
        <PageHeader title="Stores" sub="All stores, priority and opportunity monitor — click any row for SOC Store Locator"/>
        <div className="flex items-center gap-2 mb-5 flex-wrap">
          <button onClick={()=>setTab("priority")} className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-colors ${tab==="priority"?"bg-red-500/20 text-red-400 border border-red-500/30":"bg-secondary text-muted-foreground hover:text-foreground border border-border"}`}>
            <Star size={13}/>Priority<span className={`text-[10px] px-1.5 py-0.5 rounded-full font-bold ${tab==="priority"?"bg-red-500 text-white":"bg-secondary text-muted-foreground"}`}>{PRIORITY_STORE_DATA.length}</span>
          </button>
          <button onClick={()=>setTab("opportunity")} className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-colors ${tab==="opportunity"?"bg-yellow-500/20 text-yellow-400 border border-yellow-500/30":"bg-secondary text-muted-foreground hover:text-foreground border border-border"}`}>
            <TrendingUp size={13}/>Opportunity<span className={`text-[10px] px-1.5 py-0.5 rounded-full font-bold ${tab==="opportunity"?"bg-yellow-500 text-white":"bg-secondary text-muted-foreground"}`}>{OPPORTUNITY_STORE_DATA.length}</span>
          </button>
        </div>

        {false && (
          <>
            {/* removed: All Stores tab */}
            <div className="grid grid-cols-3 gap-3 mb-5">
              <div className="rounded-2xl border border-emerald-500/25 bg-emerald-500/5 p-4 flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-emerald-500/15 flex items-center justify-center shrink-0">
                  <div className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse"/>
                </div>
                <div>
                  <p className="text-lg font-black text-emerald-400">{allStoreIds.filter(id=>liveSet.has(id)).length}</p>
                  <p className="text-[10px] text-emerald-400/70 font-semibold uppercase tracking-wider">Live Observation</p>
                </div>
              </div>
              <div className="rounded-2xl border border-blue-500/25 bg-blue-500/5 p-4 flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-blue-500/15 flex items-center justify-center shrink-0">
                  <Building2 size={14} className="text-blue-400"/>
                </div>
                <div>
                  <p className="text-lg font-black text-blue-400">{allStoreIds.filter(id=>assignedSet.has(id)&&!liveSet.has(id)).length}</p>
                  <p className="text-[10px] text-blue-400/70 font-semibold uppercase tracking-wider">Assigned Only</p>
                </div>
              </div>
              <div className="rounded-2xl border border-border bg-card p-4 flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-secondary flex items-center justify-center shrink-0">
                  <Building2 size={14} className="text-muted-foreground"/>
                </div>
                <div>
                  <p className="text-lg font-black text-foreground">{allStoreIds.filter(id=>!assignedSet.has(id)).length}</p>
                  <p className="text-[10px] text-muted-foreground font-semibold uppercase tracking-wider">Unmonitored</p>
                </div>
              </div>
            </div>

            {/* Search */}
            <div className="relative mb-3">
              <Search size={13} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground"/>
              <input
                value={search} onChange={e=>setSearch(e.target.value)}
                placeholder="Search store ID or city…"
                className="w-full pl-9 pr-4 py-2.5 rounded-xl bg-secondary/40 border border-border text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-blue-500/50"
              />
              {search && <button onClick={()=>setSearch("")} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"><X size={13}/></button>}
            </div>

            <div className="rounded-2xl border border-border bg-card overflow-hidden">
              <div className="flex items-center justify-between px-5 py-3 border-b border-border">
                <div className="flex items-center gap-2">
                  <Building2 size={14} className="text-blue-400"/>
                  <span className="text-xs font-bold tracking-widest uppercase text-foreground">All Stores</span>
                  <span className="text-[10px] text-muted-foreground">{filteredAll.length} of {allStoreIds.length}</span>
                </div>
                <div className="flex items-center gap-3 text-[10px]">
                  <span className="flex items-center gap-1"><div className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"/>Live Obs</span>
                  <span className="flex items-center gap-1"><div className="w-1.5 h-1.5 rounded-full bg-blue-400"/>Assigned</span>
                  <span className="flex items-center gap-1"><div className="w-1.5 h-1.5 rounded-full bg-slate-600"/>Unmonitored</span>
                </div>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead><tr className="border-b border-border">{["Status","Store ID","City / Location","Live Operator","Assigned To","Actions"].map(h=><th key={h} className="text-left px-4 py-3 text-[10px] font-bold tracking-widest text-muted-foreground uppercase whitespace-nowrap">{h}</th>)}</tr></thead>
                  <tbody>
                    {filteredAll.map((id,i)=>{
                      const isLive     = liveSet.has(id);
                      const isAssigned = assignedSet.has(id);
                      const city       = cityOf(id);
                      const liveOps    = liveOpFor[id]   || [];
                      const asgnOps    = assignedOpFor[id] || [];
                      const rowBg      = isLive
                        ? "bg-emerald-500/5 hover:bg-emerald-500/8"
                        : isAssigned
                          ? "hover:bg-blue-500/5"
                          : "hover:bg-white/[0.02]" + (i%2===0?"":" bg-white/[0.015]");
                      return (
                        <tr key={id} onClick={()=>setSelectedStore(id)} className={`border-b border-border/40 cursor-pointer transition-colors group ${rowBg}`}>
                          <td className="px-4 py-3 w-6">
                            {isLive
                              ? <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"/>
                              : isAssigned
                                ? <div className="w-2 h-2 rounded-full bg-blue-400"/>
                                : <div className="w-2 h-2 rounded-full bg-slate-600"/>
                            }
                          </td>
                          <td className="px-4 py-3">
                            <span className={`font-mono font-bold ${isLive?"text-emerald-400":isAssigned?"text-blue-400":"text-muted-foreground"}`}>#{id}</span>
                          </td>
                          <td className="px-4 py-3">
                            {city
                              ? <span className="text-foreground">{city}</span>
                              : <span className="text-muted-foreground/50 italic text-[10px]">—</span>
                            }
                          </td>
                          <td className="px-4 py-3">
                            {liveOps.length > 0
                              ? <div className="flex flex-wrap gap-1">
                                  {liveOps.map(op=>(
                                    <span key={op.id} className="flex items-center gap-1 px-2 py-0.5 rounded-lg bg-emerald-500/10 text-emerald-400 text-[9px] font-bold border border-emerald-500/20">
                                      <div className="w-1 h-1 rounded-full bg-emerald-400 animate-pulse"/>{op.name}
                                    </span>
                                  ))}
                                </div>
                              : <span className="text-muted-foreground/50 text-[10px]">—</span>
                            }
                          </td>
                          <td className="px-4 py-3">
                            {asgnOps.length > 0
                              ? <div className="flex flex-wrap gap-1">
                                  {asgnOps.map(op=>(
                                    <span key={op.id} className="px-2 py-0.5 rounded-lg bg-blue-500/10 text-blue-400 text-[9px] font-semibold border border-blue-500/15">
                                      {op.name}
                                    </span>
                                  ))}
                                </div>
                              : <span className="text-muted-foreground/50 text-[10px] italic">Unassigned</span>
                            }
                          </td>
                          <td className="px-4 py-3">
                            <span className="text-[10px] text-blue-400 opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1">
                              <Building2 size={10}/>Locator
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        )}

        {tab==="priority"&&(
          <>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-5">
              <StatCard label="Total Priority"   value={PRIORITY_STORE_DATA.length}                                   color="bg-red-500/20 text-red-400"       icon={Star}/>
              <StatCard label="Active Incidents" value={PRIORITY_STORE_DATA.filter(s=>s.status==="incident").length}  color="bg-orange-500/20 text-orange-400"  icon={AlertTriangle} alert/>
              <StatCard label="Clear"            value={PRIORITY_STORE_DATA.filter(s=>s.status==="clear").length}     color="bg-emerald-500/20 text-emerald-400" icon={CheckCircle}/>
              <StatCard label="Open Alarms"      value={PRIORITY_STORE_DATA.reduce((a,s)=>a+s.alarms,0)}             color="bg-yellow-500/20 text-yellow-400"  icon={Activity}/>
            </div>
            <div className="rounded-2xl border border-border bg-card overflow-hidden">
              <div className="flex items-center gap-2 px-5 py-3 border-b border-border">
                <Star size={14} className="text-red-400"/>
                <span className="text-xs font-bold tracking-widest uppercase text-foreground">Priority Store Monitor</span>
                <Chip className="bg-blue-500/15 text-blue-400 ml-1">Click row for store locator</Chip>
              </div>
              <table className="w-full text-xs">
                <thead><tr className="border-b border-border">{["Store","City","Region","LP Contact","Alarms","Cameras","Status",""].map(h=><th key={h} className="text-left px-4 py-3 text-[10px] font-bold tracking-widest text-muted-foreground uppercase">{h}</th>)}</tr></thead>
                <tbody>
                  {PRIORITY_STORE_DATA.map((s,i)=>{
                    const ss=s.status==="incident"?{text:"text-red-400",bg:"bg-red-500/15",label:"Incident"}:s.status==="monitoring"?{text:"text-blue-400",bg:"bg-blue-500/15",label:"Monitoring"}:{text:"text-emerald-400",bg:"bg-emerald-500/15",label:"Clear"};
                    return(
                      <tr key={s.id} onClick={()=>setSelectedStore(s.id)} className={`border-b border-border/50 hover:bg-blue-500/5 cursor-pointer transition-colors group ${i%2===0?"":"bg-white/[0.02]"}`}>
                        <td className="px-4 py-3 font-mono font-bold text-foreground">#{s.id}</td>
                        <td className="px-4 py-3 text-foreground">{s.city}</td>
                        <td className="px-4 py-3"><Chip className="bg-secondary text-secondary-foreground">{s.region}</Chip></td>
                        <td className="px-4 py-3 text-foreground">{s.lp}</td>
                        <td className="px-4 py-3"><span className={`font-bold ${s.alarms>0?"text-red-400":"text-muted-foreground"}`}>{s.alarms}</span></td>
                        <td className="px-4 py-3"><span className={`font-mono ${s.cameras===0?"text-red-400":"text-foreground"}`}>{s.cameras}</span></td>
                        <td className="px-4 py-3"><Chip className={`${ss.bg} ${ss.text}`}>{ss.label}</Chip></td>
                        <td className="px-4 py-3"><span className="text-[11px] text-blue-400 opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1"><Building2 size={10}/>Locator</span></td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </>
        )}

        {tab==="opportunity"&&(
          <>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-5">
              <StatCard label="Total Opportunity" value={OPPORTUNITY_STORE_DATA.length}                                        color="bg-yellow-500/20 text-yellow-400"  icon={TrendingUp}/>
              <StatCard label="Trending Up"        value={OPPORTUNITY_STORE_DATA.filter(s=>s.trend==="up").length}             color="bg-red-500/20 text-red-400"        icon={TrendingUp}/>
              <StatCard label="Trending Down"      value={OPPORTUNITY_STORE_DATA.filter(s=>s.trend==="down").length}           color="bg-emerald-500/20 text-emerald-400" icon={TrendingDown}/>
              <StatCard label="Est. Monthly Loss"  value="$10,340"                                                              color="bg-orange-500/20 text-orange-400"  icon={BarChart2}/>
            </div>
            <div className="rounded-2xl border border-border bg-card overflow-hidden">
              <div className="flex items-center gap-2 px-5 py-3 border-b border-border">
                <TrendingUp size={14} className="text-yellow-400"/>
                <span className="text-xs font-bold tracking-widest uppercase text-foreground">Opportunity Store Monitor</span>
                <Chip className="bg-blue-500/15 text-blue-400 ml-1">Click row for store locator</Chip>
              </div>
              <table className="w-full text-xs">
                <thead><tr className="border-b border-border">{["Store","City","Region","Loss (MTD)","Trend","Open Alarms","","Action"].map(h=><th key={h} className="text-left px-4 py-3 text-[10px] font-bold tracking-widest text-muted-foreground uppercase">{h}</th>)}</tr></thead>
                <tbody>
                  {OPPORTUNITY_STORE_DATA.map((s,i)=>(
                    <tr key={s.id} onClick={()=>setSelectedStore(s.id)} className={`border-b border-border/50 hover:bg-blue-500/5 cursor-pointer transition-colors group ${i%2===0?"":"bg-white/[0.02]"}`}>
                      <td className="px-4 py-3 font-mono font-bold text-foreground">#{s.id}</td>
                      <td className="px-4 py-3 text-foreground">{s.city}</td>
                      <td className="px-4 py-3"><Chip className="bg-secondary text-secondary-foreground">{s.region}</Chip></td>
                      <td className="px-4 py-3 font-mono font-semibold text-orange-400">{s.lossAmt}</td>
                      <td className="px-4 py-3"><span className={`flex items-center gap-1 text-[11px] font-semibold ${s.trend==="up"?"text-red-400":"text-emerald-400"}`}>{s.trend==="up"?<TrendingUp size={11}/>:<TrendingDown size={11}/>}{s.trend==="up"?"Increasing":"Decreasing"}</span></td>
                      <td className="px-4 py-3"><span className={`font-bold ${s.alarms>0?"text-red-400":"text-muted-foreground"}`}>{s.alarms}</span></td>
                      <td className="px-4 py-3"><span className="text-[11px] text-blue-400 opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1"><Building2 size={10}/>Locator</span></td>
                      <td className="px-4 py-3"><button onClick={e=>{e.stopPropagation();}} className="px-2.5 py-1 rounded-lg bg-blue-600/20 hover:bg-blue-600/30 text-blue-400 text-[11px] font-semibold border border-blue-500/20 transition-colors">Monitor</button></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>
    </>
  );
}

// ─── Watch List View ──────────────────────────────────────────────────────────

function WatchListView() {
  const [selectedStore,setSelectedStore] = useState<string|null>(null);
  const escalationRisk = WATCH_LIST_DATA.filter(s=>s.flag==="Escalation Risk").length;
  const notMonitored   = WATCH_LIST_DATA.filter(s=>!s.socMonitored).length;
  return (
    <>
      {selectedStore&&<StoreLocatorPanel storeId={selectedStore} onClose={()=>setSelectedStore(null)}/>}
      <div>
        <PageHeader title="Watch List" sub="Stores requiring attention but not yet elevated to Priority or Opportunity status"/>
        <div className="rounded-2xl border border-yellow-500/10 bg-yellow-500/5 p-4 mb-5">
          <div className="flex items-start gap-3"><BookOpen size={15} className="text-yellow-400 mt-0.5 shrink-0"/><p className="text-xs text-muted-foreground leading-relaxed">Tracks stores with emerging concerns — camera gaps, staffing issues, new ORC activity, seasonal risk, or stores not yet onboarded to SOC monitoring. Click any row to pull up the store locator for contact information.</p></div>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-5">
          <StatCard label="Watched Stores"  value={WATCH_LIST_DATA.length}          color="bg-blue-500/20 text-blue-400"     icon={BookOpen}/>
          <StatCard label="Escalation Risk" value={escalationRisk}                  color="bg-red-500/20 text-red-400"       icon={AlertTriangle} alert={escalationRisk>0}/>
          <StatCard label="No SOC Monitor"  value={notMonitored}                    color="bg-orange-500/20 text-orange-400" icon={Eye}/>
          <StatCard label="Pending Review"  value={WATCH_LIST_DATA.filter(s=>s.lastReview<"07/04/2026").length} color="bg-yellow-500/20 text-yellow-400" icon={Clock}/>
        </div>
        <div className="rounded-2xl border border-border bg-card overflow-hidden mb-4">
          <div className="flex items-center gap-2 px-5 py-3 border-b border-border">
            <BookOpen size={14} className="text-blue-400"/>
            <span className="text-xs font-bold tracking-widest uppercase text-foreground">Watch List Monitor</span>
            <Chip className="bg-blue-500/15 text-blue-400 ml-1">Click row for store locator</Chip>
          </div>
          <table className="w-full text-xs">
            <thead><tr className="border-b border-border">{["Store","City","Region","Reason","Tier","SOC Mon.","Flag","Last Review",""].map(h=><th key={h} className="text-left px-4 py-3 text-[10px] font-bold tracking-widest text-muted-foreground uppercase whitespace-nowrap">{h}</th>)}</tr></thead>
            <tbody>
              {WATCH_LIST_DATA.map((s,i)=>{
                const fs=FLAG_STYLE[s.flag]??{bg:"bg-secondary",text:"text-muted-foreground"};
                return(
                  <tr key={s.id} onClick={()=>setSelectedStore(s.id)} className={`border-b border-border/50 hover:bg-blue-500/5 cursor-pointer transition-colors group ${i%2===0?"":"bg-white/[0.02]"}`}>
                    <td className="px-4 py-3 font-mono font-bold text-foreground">#{s.id}</td>
                    <td className="px-4 py-3 text-foreground">{s.city}</td>
                    <td className="px-4 py-3"><Chip className="bg-secondary text-secondary-foreground">{s.region}</Chip></td>
                    <td className="px-4 py-3 text-muted-foreground max-w-xs truncate">{s.reason}</td>
                    <td className="px-4 py-3 text-muted-foreground">{s.tier}</td>
                    <td className="px-4 py-3"><span className={`flex items-center gap-1 font-semibold ${s.socMonitored?"text-emerald-400":"text-red-400"}`}>{s.socMonitored?<><CheckCircle size={10}/>Yes</>:<><AlertTriangle size={10}/>No</>}</span></td>
                    <td className="px-4 py-3"><Chip className={`${fs.bg} ${fs.text}`}>{s.flag}</Chip></td>
                    <td className="px-4 py-3 font-mono text-muted-foreground">{s.lastReview}</td>
                    <td className="px-4 py-3"><span className="text-[11px] text-blue-400 opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1"><Building2 size={10}/>Locator</span></td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        {/* Escalation risk cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {WATCH_LIST_DATA.filter(s=>s.flag==="Escalation Risk").map(s=>(
            <div key={s.id} className="rounded-xl border border-red-500/20 bg-red-500/5 p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="font-mono font-bold text-foreground text-sm">#{s.id} — {s.city}</span>
                <Chip className="bg-red-500/20 text-red-400 text-[10px]">Escalation Risk</Chip>
              </div>
              <p className="text-xs text-muted-foreground mb-3">{s.reason}</p>
              <button onClick={()=>setSelectedStore(s.id)} className="w-full py-1.5 rounded-lg bg-red-500/15 hover:bg-red-500/25 text-red-400 border border-red-500/20 text-[11px] font-semibold transition-colors">Review Store</button>
            </div>
          ))}
        </div>
      </div>
    </>
  );
}

// ─── BOLO View ────────────────────────────────────────────────────────────────

function BOLOView() {
  const [search,setSearch] = useState("");
  const filtered = BOLO_PEOPLE.filter(p=>p.caseId.toLowerCase().includes(search.toLowerCase())||p.label.toLowerCase().includes(search.toLowerCase())||p.lastStore.includes(search));
  return (
    <div>
      <PageHeader title="BOLO — Be On the Lookout" sub={`${BOLO_PEOPLE.length} active cases`} action={<button className="flex items-center gap-2 px-4 py-2 rounded-xl bg-orange-500 hover:bg-orange-400 text-white text-xs font-bold transition-colors"><Plus size={13}/>Add BOLO</button>}/>
      <div className="flex items-center gap-3 mb-5">
        <div className="relative flex-1 max-w-sm"><Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"/><input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search case ID, store…" className="w-full pl-9 pr-3 py-2 rounded-xl text-xs bg-secondary border border-border text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-orange-500/40"/></div>
        <Chip className="bg-orange-500/15 text-orange-400">{filtered.length} subjects</Chip>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {filtered.map(person=>(
          <div key={person.id} className="rounded-2xl border border-orange-500/20 bg-card overflow-hidden hover:border-orange-500/50 transition-colors cursor-pointer">
            <div className="relative h-48 overflow-hidden bg-slate-900">
              <img src={person.photo} alt={person.label} className="w-full h-full object-cover object-top" style={{filter:"grayscale(1) brightness(0.7)"}} onMouseEnter={e=>(e.currentTarget.style.filter="grayscale(0.2) brightness(0.85)")} onMouseLeave={e=>(e.currentTarget.style.filter="grayscale(1) brightness(0.7)")}/>
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent"/>
              <div className="absolute top-3 left-3"><span className="text-[11px] font-bold bg-orange-500 text-white px-2 py-1 rounded-lg flex items-center gap-1"><Hash size={9}/>{person.caseId}</span></div>
              <div className="absolute top-3 right-3"><span className="text-[10px] font-bold bg-red-500 text-white px-1.5 py-0.5 rounded">ACTIVE</span></div>
              <div className="absolute bottom-3 left-3 right-3"><p className="text-white font-bold text-sm">{person.label}</p><p className="text-slate-300 text-xs">{person.description}</p></div>
            </div>
            <div className="p-4 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2"><MapPin size={12} className="text-orange-400"/><span className="text-xs text-foreground">Last seen: <span className="font-mono font-bold">#{person.lastStore}</span></span></div>
                <span className="text-[11px] font-mono text-muted-foreground">{person.lastSeen} · {person.date}</span>
              </div>
              <div className="rounded-lg border border-border bg-secondary/30 p-2.5"><p className="text-[11px] text-muted-foreground leading-relaxed">{person.notes}</p></div>
              <div className="flex gap-2">
                <button className="flex-1 py-1.5 rounded-lg bg-orange-500/15 hover:bg-orange-500/25 text-orange-400 border border-orange-500/20 text-[11px] font-semibold transition-colors">Alert Stores</button>
                <button
                  onClick={()=>navigator.clipboard.writeText(person.filePath)}
                  title={person.filePath}
                  className="flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-lg bg-slate-700/40 hover:bg-orange-500/15 text-slate-400 hover:text-orange-400 border border-white/5 hover:border-orange-500/20 text-[11px] font-semibold transition-colors"
                >
                  <FolderOpen size={11}/>View in S Drive
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Dataminr View ────────────────────────────────────────────────────────────

function DataminrView() {
  const [filter,setFilter] = useState<DataminrAlert["type"]|"all">("all");
  const [emailOpen,setEmailOpen] = useState<string|null>(null);
  const [emailBody,setEmailBody] = useState("");
  const filtered = filter==="all"?DATAMINR_ALERTS:DATAMINR_ALERTS.filter(a=>a.type===filter);
  const typeLabels: Record<string,string> = {shooting:"Shooting",weather:"Weather",civil_unrest:"Civil Unrest",fire:"Fire",hazmat:"HAZMAT",power:"Power",traffic:"Traffic"};

  function openEmail(alertId:string,alertTitle:string) {
    setEmailOpen(alertId);
    setEmailBody(`Team,\n\nDataminr has issued the following alert that may impact our operations:\n\n${alertTitle}\n\nPlease review the affected stores and take appropriate action.\n\nRegards,\nSOC Operations`);
  }

  return (
    <div>
      <PageHeader title="Dataminr Intelligence Feed" sub="Real-time alerts that may impact store operations and safety"/>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-5">
        <StatCard label="Total Alerts"   value={DATAMINR_ALERTS.length}                                      color="bg-purple-500/20 text-purple-400" icon={Radio}/>
        <StatCard label="Critical"        value={DATAMINR_ALERTS.filter(a=>a.severity==="critical").length}  color="bg-red-500/20 text-red-400"       icon={AlertOctagon} alert/>
        <StatCard label="Stores Affected" value={new Set(DATAMINR_ALERTS.flatMap(a=>a.affectedStores)).size} color="bg-orange-500/20 text-orange-400" icon={MapPin}/>
        <StatCard label="High Priority"   value={DATAMINR_ALERTS.filter(a=>a.severity==="high").length}      color="bg-yellow-500/20 text-yellow-400" icon={AlertTriangle}/>
      </div>
      <div className="flex items-center gap-2 mb-4 flex-wrap">
        <button onClick={()=>setFilter("all")} className={`px-3 py-1.5 rounded-xl text-[11px] font-semibold transition-colors ${filter==="all"?"bg-blue-600 text-white":"bg-secondary text-muted-foreground hover:text-foreground"}`}>All</button>
        {(Object.keys(typeLabels) as DataminrAlert["type"][]).map(t=>{const dc=dmCfg(t);const Icon=dc.Icon;return(<button key={t} onClick={()=>setFilter(filter===t?"all":t)} className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[11px] font-semibold transition-colors ${filter===t?`${dc.bg} ${dc.color} border border-current/30`:"bg-secondary text-muted-foreground hover:text-foreground"}`}><Icon size={11}/>{typeLabels[t]}</button>);})}
      </div>
      {emailOpen&&(
        <div className="rounded-2xl border border-blue-500/30 bg-blue-500/5 p-5 mb-4">
          <div className="flex items-center justify-between mb-3"><div className="flex items-center gap-2"><Mail size={15} className="text-blue-400"/><p className="text-sm font-bold text-foreground">Compose RLPD Notification</p></div><button onClick={()=>setEmailOpen(null)} className="text-muted-foreground hover:text-foreground"><X size={14}/></button></div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-3">
            <div><label className="text-[10px] font-bold tracking-widest text-muted-foreground uppercase block mb-1">To</label><input defaultValue="RLPD@bealls.com; regionalLP@bealls.com" className="w-full px-3 py-2 rounded-lg text-xs bg-secondary border border-border text-foreground focus:outline-none focus:ring-1 focus:ring-blue-500/50"/></div>
            <div><label className="text-[10px] font-bold tracking-widest text-muted-foreground uppercase block mb-1">Subject</label><input defaultValue={`Dataminr Alert — ${DATAMINR_ALERTS.find(a=>a.id===emailOpen)?.title}`} className="w-full px-3 py-2 rounded-lg text-xs bg-secondary border border-border text-foreground focus:outline-none focus:ring-1 focus:ring-blue-500/50"/></div>
          </div>
          <div><label className="text-[10px] font-bold tracking-widest text-muted-foreground uppercase block mb-1">Message</label><textarea value={emailBody} onChange={e=>setEmailBody(e.target.value)} rows={5} className="w-full px-3 py-2 rounded-lg text-xs bg-secondary border border-border text-foreground focus:outline-none focus:ring-1 focus:ring-blue-500/50 resize-none"/></div>
          <div className="flex gap-2 mt-3"><button className="flex items-center gap-2 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold transition-colors"><Mail size={13}/>Send to RLPD</button><button onClick={()=>setEmailOpen(null)} className="px-4 py-2 rounded-xl bg-secondary hover:bg-secondary/70 text-secondary-foreground text-xs font-semibold border border-border transition-colors">Cancel</button></div>
        </div>
      )}
      <div className="space-y-3">
        {filtered.map(alert=>{const sc=sevCfg(alert.severity);const dc=dmCfg(alert.type);const Icon=dc.Icon;return(
          <div key={alert.id} className={`rounded-2xl border ${sc.border} bg-card p-5`}>
            <div className="flex items-start gap-4">
              <div className={`w-10 h-10 rounded-xl ${dc.bg} flex items-center justify-center shrink-0 mt-0.5`}><Icon size={18} className={dc.color}/></div>
              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between gap-3 mb-2">
                  <div>
                    <div className="flex items-center gap-2 mb-1"><Chip className={sc.badge}><span className={`w-1 h-1 rounded-full ${sc.dot}`}/>{sc.label}</Chip><Chip className={`${dc.bg} ${dc.color}`}>{typeLabels[alert.type]}</Chip></div>
                    <h3 className="text-sm font-bold text-foreground">{alert.title}</h3>
                  </div>
                  <div className="text-right shrink-0"><p className="text-[11px] font-mono text-muted-foreground">{alert.time}</p><p className="text-[10px] text-muted-foreground mt-0.5">{alert.source}</p></div>
                </div>
                <p className="text-xs text-muted-foreground leading-relaxed mb-3">{alert.description}</p>
                <div className="flex items-center gap-3 flex-wrap">
                  <div className="flex items-center gap-1.5"><MapPin size={11} className="text-muted-foreground"/><span className="text-xs text-foreground">{alert.location}</span></div>
                  <div className="flex items-center gap-1.5"><span className="text-[11px] text-muted-foreground">Affected:</span>{alert.affectedStores.map(s=><StoreTag key={s} id={s} color="bg-secondary text-secondary-foreground"/>)}</div>
                  <div className="ml-auto flex gap-2">
                    <button onClick={()=>openEmail(alert.id,alert.title)} className="flex items-center gap-1.5 px-3 py-1 rounded-lg bg-blue-500/15 hover:bg-blue-500/25 text-blue-400 border border-blue-500/20 text-[11px] font-semibold transition-colors"><Mail size={11}/>Email</button>
                    <button className="px-3 py-1 rounded-lg bg-secondary hover:bg-secondary/70 text-secondary-foreground text-[11px] font-semibold border border-border transition-colors">Acknowledge</button>
                    <button className="flex items-center gap-1.5 px-3 py-1 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-[11px] font-semibold transition-colors"><Siren size={11}/>Notify RLPD</button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        );})}
      </div>
    </div>
  );
}

// ─── Systems Down View ────────────────────────────────────────────────────────

function statusStyle(s: "Open"|"In Progress"|"Resolved") {
  return s==="Open"?{bg:"bg-red-500/15",text:"text-red-400"}:s==="In Progress"?{bg:"bg-yellow-500/15",text:"text-yellow-400"}:{bg:"bg-emerald-500/15",text:"text-emerald-400"};
}

function PADownView() {
  const [tab, setTab] = useState<"pa"|"cameras"|"nvr">("pa");

  const paOpen     = PA_DOWN_STORES.filter(s=>s.status!=="Resolved").length;
  const camOpen    = CAM_DOWN_STORES.filter(s=>s.status!=="Resolved").length;
  const nvrOpen    = NVR_DOWN_STORES.filter(s=>s.status!=="Resolved").length;
  const totalCamsOffline = CAM_DOWN_STORES.filter(s=>s.status!=="Resolved").reduce((a,s)=>a+s.camerasDown,0);

  const tabs = [
    { id:"pa"      as const, label:"PA System",  icon:Volume2, count:paOpen,  color:paOpen>0?"text-red-400":"text-muted-foreground",  activeCls:"bg-red-500/20 text-red-400 border border-red-500/30" },
    { id:"cameras" as const, label:"Cameras",    icon:Tv2,     count:camOpen, color:camOpen>0?"text-orange-400":"text-muted-foreground", activeCls:"bg-orange-500/20 text-orange-400 border border-orange-500/30" },
    { id:"nvr"     as const, label:"NVR / DVR",  icon:Server,  count:nvrOpen, color:nvrOpen>0?"text-purple-400":"text-muted-foreground", activeCls:"bg-purple-500/20 text-purple-400 border border-purple-500/30" },
  ];

  return (
    <div>
      <PageHeader
        title="Systems Down"
        sub="Centralized view — PA systems, cameras, and NVR/DVR units"
        action={<button className="flex items-center gap-2 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold transition-colors"><Plus size={13}/>Log Issue</button>}
      />

      {/* Cross-system summary strip */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-5">
        <StatCard label="PA Systems Down"  value={paOpen}           color="bg-red-500/20 text-red-400"       icon={Volume2}    alert={paOpen>0}/>
        <StatCard label="Cameras Offline"  value={totalCamsOffline} sub="across all stores" color="bg-orange-500/20 text-orange-400"  icon={Tv2}        alert={totalCamsOffline>0}/>
        <StatCard label="NVR / DVR Down"   value={nvrOpen}          color="bg-purple-500/20 text-purple-400" icon={Server}     alert={nvrOpen>0}/>
        <StatCard label="Total Open Tickets" value={paOpen+camOpen+nvrOpen} color="bg-yellow-500/20 text-yellow-400" icon={Activity}/>
      </div>

      {/* Tab strip */}
      <div className="flex items-center gap-2 mb-5">
        {tabs.map(t => {
          const Icon = t.icon;
          const active = tab===t.id;
          return (
            <button key={t.id} onClick={()=>setTab(t.id)} className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-colors ${active?t.activeCls:"bg-secondary text-muted-foreground hover:text-foreground border border-border"}`}>
              <Icon size={13}/>{t.label}
              <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-bold ${active?"bg-current/20":"bg-secondary text-muted-foreground"}`}>{t.count}</span>
            </button>
          );
        })}
      </div>

      {/* ── PA Down ── */}
      {tab==="pa" && (
        <div className="rounded-2xl border border-border bg-card overflow-hidden">
          <div className="flex items-center gap-2 px-5 py-3 border-b border-border">
            <Volume2 size={14} className="text-red-400"/>
            <span className="text-xs font-bold tracking-widest uppercase text-foreground">PA System Issues</span>
            <Chip className="bg-red-500/15 text-red-400 ml-1">{paOpen} open</Chip>
          </div>
          <table className="w-full text-xs">
            <thead><tr className="border-b border-border">{["Store","City","Date Down","Days Down","Ticket #","Assigned Tech","Status","Action"].map(h=><th key={h} className="text-left px-4 py-3 text-[10px] font-bold tracking-widest text-muted-foreground uppercase whitespace-nowrap">{h}</th>)}</tr></thead>
            <tbody>{PA_DOWN_STORES.map((s,i)=>{const ss=statusStyle(s.status);return(
              <tr key={s.storeId} className={`border-b border-border/50 hover:bg-blue-500/5 transition-colors ${i%2===0?"":"bg-white/[0.02]"}`}>
                <td className="px-4 py-3 font-mono font-bold text-foreground">#{s.storeId}</td>
                <td className="px-4 py-3 text-foreground">{s.city}</td>
                <td className="px-4 py-3 font-mono text-foreground">{s.dateDown}</td>
                <td className="px-4 py-3"><span className={`font-bold font-mono ${s.daysDown>5?"text-red-400":s.daysDown>2?"text-yellow-400":"text-foreground"}`}>{s.daysDown}d</span></td>
                <td className="px-4 py-3 font-mono text-muted-foreground">{s.ticketNum}</td>
                <td className="px-4 py-3 text-foreground">{s.assignedTech}</td>
                <td className="px-4 py-3"><Chip className={`${ss.bg} ${ss.text}`}>{s.status}</Chip></td>
                <td className="px-4 py-3"><div className="flex gap-1.5"><button className="px-2.5 py-1 rounded-lg bg-secondary hover:bg-secondary/70 text-secondary-foreground text-[11px] font-semibold border border-border transition-colors">Update</button>{s.status!=="Resolved"&&<button className="px-2.5 py-1 rounded-lg bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-400 border border-emerald-500/20 text-[11px] font-semibold transition-colors">Resolve</button>}</div></td>
              </tr>
            );})}
            </tbody>
          </table>
        </div>
      )}

      {/* ── Cameras Down ── */}
      {tab==="cameras" && (
        <div className="rounded-2xl border border-border bg-card overflow-hidden">
          <div className="flex items-center gap-2 px-5 py-3 border-b border-border">
            <Tv2 size={14} className="text-orange-400"/>
            <span className="text-xs font-bold tracking-widest uppercase text-foreground">Camera Outages</span>
            <Chip className="bg-orange-500/15 text-orange-400 ml-1">{totalCamsOffline} cameras offline</Chip>
          </div>
          <table className="w-full text-xs">
            <thead><tr className="border-b border-border">{["Store","City","Cameras Down","Coverage","Reason","Date Down","Days Down","Ticket #","Assigned Tech","Status","Action"].map(h=><th key={h} className="text-left px-4 py-3 text-[10px] font-bold tracking-widest text-muted-foreground uppercase whitespace-nowrap">{h}</th>)}</tr></thead>
            <tbody>{CAM_DOWN_STORES.map((s,i)=>{
              const ss = statusStyle(s.status);
              const pct = Math.round((s.camerasDown/s.totalCameras)*100);
              const coverageColor = pct>=100?"text-red-400":pct>=50?"text-orange-400":"text-yellow-400";
              return(
                <tr key={s.storeId+i} className={`border-b border-border/50 hover:bg-blue-500/5 transition-colors ${i%2===0?"":"bg-white/[0.02]"}`}>
                  <td className="px-4 py-3 font-mono font-bold text-foreground">#{s.storeId}</td>
                  <td className="px-4 py-3 text-foreground">{s.city}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <span className={`font-bold font-mono ${coverageColor}`}>{s.camerasDown}</span>
                      <span className="text-muted-foreground">/ {s.totalCameras}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <div className="w-16 h-1.5 rounded-full bg-secondary"><div className={`h-full rounded-full ${pct>=100?"bg-red-500":pct>=50?"bg-orange-500":"bg-yellow-500"}`} style={{width:`${pct}%`}}/></div>
                      <span className={`text-[11px] font-mono font-bold ${coverageColor}`}>{pct}%</span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-muted-foreground max-w-[180px] truncate">{s.reason}</td>
                  <td className="px-4 py-3 font-mono text-foreground">{s.dateDown}</td>
                  <td className="px-4 py-3"><span className={`font-bold font-mono ${s.daysDown>5?"text-red-400":s.daysDown>2?"text-yellow-400":"text-foreground"}`}>{s.daysDown}d</span></td>
                  <td className="px-4 py-3 font-mono text-muted-foreground">{s.ticketNum}</td>
                  <td className="px-4 py-3 text-foreground">{s.assignedTech}</td>
                  <td className="px-4 py-3"><Chip className={`${ss.bg} ${ss.text}`}>{s.status}</Chip></td>
                  <td className="px-4 py-3"><div className="flex gap-1.5"><button className="px-2.5 py-1 rounded-lg bg-secondary hover:bg-secondary/70 text-secondary-foreground text-[11px] font-semibold border border-border transition-colors">Update</button>{s.status!=="Resolved"&&<button className="px-2.5 py-1 rounded-lg bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-400 border border-emerald-500/20 text-[11px] font-semibold transition-colors">Resolve</button>}</div></td>
                </tr>
              );
            })}
            </tbody>
          </table>
          {CAM_DOWN_STORES.some(s=>s.camerasDown===s.totalCameras&&s.status!=="Resolved")&&(
            <div className="m-4 rounded-xl border border-red-500/20 bg-red-500/5 p-3">
              <div className="flex items-start gap-2"><AlertTriangle size={13} className="text-red-400 mt-0.5 shrink-0"/><p className="text-xs text-red-400 font-semibold">Complete camera blind spot — {CAM_DOWN_STORES.filter(s=>s.camerasDown===s.totalCameras&&s.status!=="Resolved").map(s=>`Store #${s.storeId}`).join(", ")} have zero active feeds. Recommend manual LP coverage or temporary deterrent.</p></div>
            </div>
          )}
        </div>
      )}

      {/* ── NVR Down ── */}
      {tab==="nvr" && (
        <div className="rounded-2xl border border-border bg-card overflow-hidden">
          <div className="flex items-center gap-2 px-5 py-3 border-b border-border">
            <Server size={14} className="text-purple-400"/>
            <span className="text-xs font-bold tracking-widest uppercase text-foreground">NVR / DVR Outages</span>
            <Chip className="bg-purple-500/15 text-purple-400 ml-1">{nvrOpen} units down</Chip>
          </div>
          <table className="w-full text-xs">
            <thead><tr className="border-b border-border">{["Store","City","Unit ID","Cameras Affected","Date Down","Days Down","Ticket #","Assigned Tech","Status","Action"].map(h=><th key={h} className="text-left px-4 py-3 text-[10px] font-bold tracking-widest text-muted-foreground uppercase whitespace-nowrap">{h}</th>)}</tr></thead>
            <tbody>{NVR_DOWN_STORES.map((s,i)=>{const ss=statusStyle(s.status);return(
              <tr key={s.storeId} className={`border-b border-border/50 hover:bg-blue-500/5 transition-colors ${i%2===0?"":"bg-white/[0.02]"}`}>
                <td className="px-4 py-3 font-mono font-bold text-foreground">#{s.storeId}</td>
                <td className="px-4 py-3 text-foreground">{s.city}</td>
                <td className="px-4 py-3 font-mono text-purple-400 font-semibold">{s.nvrUnit}</td>
                <td className="px-4 py-3"><span className="font-bold text-orange-400 font-mono">{s.camerasAffected}</span><span className="text-muted-foreground ml-1">cams</span></td>
                <td className="px-4 py-3 font-mono text-foreground">{s.dateDown}</td>
                <td className="px-4 py-3"><span className={`font-bold font-mono ${s.daysDown>7?"text-red-400":s.daysDown>3?"text-yellow-400":"text-foreground"}`}>{s.daysDown}d</span></td>
                <td className="px-4 py-3 font-mono text-muted-foreground">{s.ticketNum}</td>
                <td className="px-4 py-3 text-foreground">{s.assignedTech}</td>
                <td className="px-4 py-3"><Chip className={`${ss.bg} ${ss.text}`}>{s.status}</Chip></td>
                <td className="px-4 py-3"><div className="flex gap-1.5"><button className="px-2.5 py-1 rounded-lg bg-secondary hover:bg-secondary/70 text-secondary-foreground text-[11px] font-semibold border border-border transition-colors">Update</button>{s.status!=="Resolved"&&<button className="px-2.5 py-1 rounded-lg bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-400 border border-emerald-500/20 text-[11px] font-semibold transition-colors">Resolve</button>}</div></td>
              </tr>
            );})}
            </tbody>
          </table>
          {NVR_DOWN_STORES.some(s=>s.daysDown>=7&&s.status!=="Resolved")&&(
            <div className="m-4 rounded-xl border border-yellow-500/20 bg-yellow-500/5 p-3">
              <div className="flex items-start gap-2"><AlertTriangle size={13} className="text-yellow-400 mt-0.5 shrink-0"/><p className="text-xs text-yellow-400 font-semibold">Long-running NVR outage — {NVR_DOWN_STORES.filter(s=>s.daysDown>=7&&s.status!=="Resolved").map(s=>`#${s.storeId} (${s.daysDown}d)`).join(", ")}. Escalate to vendor or regional IT.</p></div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Reports View ─────────────────────────────────────────────────────────────

const TEAM_SCORECARD = [
  { category:"Attempted\nRecovery",  ty:90, ly:68 },
  { category:"Merchandise\nRecovery",ty:82, ly:54 },
  { category:"Proactive\nDetention", ty:115,ly:98 },
  { category:"Trespassing",          ty:31, ly:18 },
];
const TEAM_OBS_PIE = [
  { name:"Live Observation", value:80.3 },
  { name:"SI Call",          value:19.7 },
];
const OBS_COLORS = ["#3B82F6","#1D4ED8"];

const CustomBarLabel = (props:{x?:number;y?:number;width?:number;value?:number}) => {
  const {x=0,y=0,width=0,value} = props;
  if (!value) return null;
  return <text x={x+width/2} y={y-4} fill="#94A3B8" textAnchor="middle" fontSize={11} fontWeight={600}>{value}</text>;
};

function ReportsView() {
  const [periodFilter,setPeriodFilter] = useState("11");
  const [perOpen,setPerOpen] = useState(false);
  return (
    <div>
      <div className="mb-5">
        <p className="text-[11px] text-muted-foreground uppercase tracking-widest font-semibold">Dashboard</p>
        <h1 className="text-xl font-bold text-foreground">SOC Team Scorecard</h1>
        <p className="text-[11px] text-muted-foreground mt-0.5">
          As of {new Date().toLocaleDateString("en-US",{month:"short",day:"numeric",year:"numeric"})}, {new Date().toLocaleTimeString("en-US",{hour:"2-digit",minute:"2-digit"})} PM · <span className="text-blue-400">On Station · {OPERATORS.filter(o=>o.onStation).length} operators</span>
        </p>
      </div>
      <div className="flex items-center gap-4 mb-5 flex-wrap">
        <div>
          <p className="text-[10px] text-muted-foreground uppercase tracking-widest font-semibold mb-1">Fiscal Period</p>
          <div className="relative">
            <button onClick={()=>setPerOpen(v=>!v)} className="flex items-center gap-2 px-3 py-2 rounded-lg bg-secondary border border-blue-500/40 text-blue-400 text-xs font-semibold min-w-[120px] justify-between">equals {periodFilter}<ChevronDown size={12}/></button>
            {perOpen&&(<div className="absolute top-10 left-0 w-36 rounded-xl border border-border bg-card shadow-xl z-20 overflow-hidden">{["1","2","3","4","5","6","7","8","9","10","11","12"].map(p=><button key={p} onClick={()=>{setPeriodFilter(p);setPerOpen(false);}} className="w-full text-left px-3 py-2 text-xs hover:bg-secondary transition-colors text-foreground">{p}</button>)}</div>)}
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {OPERATORS.filter(o=>o.onStation).map(op=>{const sc=opCfg(op.status);return(<div key={op.id} className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-secondary border border-border text-[11px]"><span className={`w-1.5 h-1.5 rounded-full ${sc.dot}`}/><span className="text-foreground font-medium">{op.name}</span><span className="text-muted-foreground font-mono">{op.extension}</span></div>);})}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
        {/* Bar chart */}
        <div className="lg:col-span-2 rounded-2xl border border-border bg-card p-5">
          <h2 className="text-xs font-bold text-foreground mb-0.5">SOC Team Scorecard TY v LY</h2>
          <p className="text-[10px] text-muted-foreground mb-3">Incident Type › Fiscal Year (All Operators)</p>
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={TEAM_SCORECARD} barGap={4} barCategoryGap="25%">
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,0.08)" vertical={false}/>
              <XAxis dataKey="category" tick={{fill:"#64748B",fontSize:10}} axisLine={false} tickLine={false} interval={0} tickFormatter={v=>v.replace("\n"," ")}/>
              <YAxis tick={{fill:"#64748B",fontSize:10}} axisLine={false} tickLine={false}/>
              <Tooltip contentStyle={{background:"#1E293B",border:"1px solid rgba(148,163,184,0.15)",borderRadius:12,color:"#F1F5F9",fontSize:12}}/>
              <Legend wrapperStyle={{fontSize:11,color:"#94A3B8"}} formatter={v=>v==="ty"?"2,026":"2,025"}/>
              <Bar key="bar-ly" dataKey="ly" name="ly" fill="#1D4ED8" fillOpacity={0.7} radius={[3,3,0,0]} label={(p:any)=><CustomBarLabel {...p}/>}/>
              <Bar key="bar-ty" dataKey="ty" name="ty" fill="#3B82F6" fillOpacity={0.9} radius={[3,3,0,0]} label={(p:any)=><CustomBarLabel {...p}/>}/>
            </BarChart>
          </ResponsiveContainer>
          <p className="text-[10px] text-blue-400 mt-2 cursor-pointer hover:underline">View Full Scorecard Report</p>
        </div>

        {/* Donut chart */}
        <div className="lg:col-span-2 rounded-2xl border border-border bg-card p-5">
          <h2 className="text-xs font-bold text-foreground mb-0.5">Live Observations — Team</h2>
          <div className="flex items-center gap-4 mb-2">
            <div className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-full bg-blue-500"/><span className="text-[11px] text-muted-foreground">Live Observation</span></div>
            <div className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-full bg-blue-800"/><span className="text-[11px] text-muted-foreground">SI Call</span></div>
          </div>
          <div className="relative">
            <ResponsiveContainer width="100%" height={200}>
              <PieChart>
                <Pie data={TEAM_OBS_PIE} cx="50%" cy="50%" innerRadius={60} outerRadius={90} paddingAngle={3} dataKey="value" startAngle={90} endAngle={-270}>
                  {TEAM_OBS_PIE.map((_,i)=><Cell key={`obs-cell-${i}`} fill={OBS_COLORS[i]}/>)}
                </Pie>
                <Tooltip contentStyle={{background:"#1E293B",border:"1px solid rgba(148,163,184,0.15)",borderRadius:12,color:"#F1F5F9",fontSize:12}} formatter={(v:number)=>`${v}%`}/>
              </PieChart>
            </ResponsiveContainer>
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <div className="text-center"><p className="text-3xl font-black text-foreground">66</p><p className="text-[10px] text-muted-foreground">Record Count</p></div>
            </div>
          </div>
          <div className="space-y-1.5 mt-2">
            {TEAM_OBS_PIE.map((d,i)=>(
              <div key={d.name} className="flex items-center justify-between"><div className="flex items-center gap-2"><span className="w-2.5 h-2.5 rounded-sm" style={{background:OBS_COLORS[i]}}/><span className="text-xs text-muted-foreground">{d.name}</span></div><span className="text-xs font-bold text-foreground">{d.value}%</span></div>
            ))}
          </div>
          <p className="text-[10px] text-blue-400 mt-3 cursor-pointer hover:underline">View Live Observations Report</p>
        </div>

        {/* KPI tiles */}
        <div className="lg:col-span-1 flex flex-col gap-4">
          <div className="flex-1 rounded-2xl border border-border bg-card p-5 flex flex-col justify-between">
            <div className="flex items-center justify-between"><h2 className="text-xs font-bold text-foreground">Store Engagements</h2><RefreshCw size={12} className="text-muted-foreground"/></div>
            <p className="text-5xl font-black text-orange-400 my-4 text-center">0</p>
            <div><p className="text-[10px] text-blue-400 cursor-pointer hover:underline">View Report</p><p className="text-[10px] text-muted-foreground mt-0.5">As of {new Date().toLocaleDateString("en-US",{month:"short",day:"numeric",year:"numeric"})}</p></div>
          </div>
          <div className="flex-1 rounded-2xl border border-border bg-card p-5 flex flex-col justify-between">
            <div className="flex items-center justify-between"><h2 className="text-xs font-bold text-foreground">Total $</h2><RefreshCw size={12} className="text-muted-foreground"/></div>
            <p className="text-4xl font-black text-emerald-400 my-4 text-center">$2.1K</p>
            <p className="text-[10px] text-muted-foreground">{new Date().toLocaleDateString("en-US",{month:"short",day:"numeric",year:"numeric"})}</p>
          </div>
          <div className="flex-1 rounded-2xl border border-border bg-card p-5 flex flex-col justify-between">
            <div className="flex items-center justify-between"><h2 className="text-xs font-bold text-foreground leading-tight">Submission or Deletion Needed</h2><RefreshCw size={12} className="text-muted-foreground shrink-0"/></div>
            <p className="text-5xl font-black text-emerald-400 my-4 text-center">0</p>
            <p className="text-[10px] text-blue-400 cursor-pointer hover:underline">View Report</p>
          </div>
        </div>
      </div>

      {/* Operator breakdown table */}
      <div className="mt-4 rounded-2xl border border-border bg-card overflow-hidden">
        <div className="flex items-center gap-2 px-5 py-3 border-b border-border"><BarChart2 size={14} className="text-blue-400"/><span className="text-xs font-bold tracking-widest uppercase text-foreground">Operator Breakdown — Period {periodFilter}</span></div>
        <table className="w-full text-xs">
          <thead><tr className="border-b border-border">{["Operator","Ext.","Status","Observations","Assigned","Live Obs","Period Progress"].map(h=><th key={h} className="text-left px-4 py-3 text-[10px] font-bold tracking-widest text-muted-foreground uppercase whitespace-nowrap">{h}</th>)}</tr></thead>
          <tbody>
            {OPERATORS.filter(o=>o.onStation).map((op,i)=>{const sc=opCfg(op.status);const Icon=sc.Icon;return(
              <tr key={op.id} className={`border-b border-border/50 hover:bg-blue-500/5 transition-colors ${i%2===0?"":"bg-white/[0.02]"}`}>
                <td className="px-4 py-3"><div className="flex items-center gap-2"><div className="w-7 h-7 rounded-full bg-gradient-to-br from-blue-600 to-blue-800 flex items-center justify-center text-[10px] font-bold text-white">{op.avatar}</div><span className="font-semibold text-foreground">{op.name}</span></div></td>
                <td className="px-4 py-3 font-mono text-blue-400 text-[11px]">{op.extension}</td>
                <td className="px-4 py-3"><div className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md ${sc.bg}`}><Icon size={9} className={sc.color}/><span className={`text-[10px] font-semibold ${sc.color}`}>{op.status}</span></div></td>
                <td className="px-4 py-3 font-bold font-mono text-foreground">{op.observations}</td>
                <td className="px-4 py-3"><span className="text-xs font-mono font-bold text-foreground">{op.assignedStores.length}</span><span className="text-[9px] text-muted-foreground ml-1">stores</span></td>
                <td className="px-4 py-3"><div className="flex flex-wrap gap-1">{op.liveObservation.map(s=><span key={s} className="flex items-center gap-0.5 px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-400 text-[9px] font-mono font-bold border border-emerald-500/20"><div className="w-1 h-1 rounded-full bg-emerald-400 animate-pulse mr-0.5"/>{s}</span>)}</div></td>
                <td className="px-4 py-3"><div className="flex items-center gap-2"><div className="flex-1 h-1.5 rounded-full bg-secondary max-w-[80px]"><div className="h-full rounded-full bg-blue-500" style={{width:`${(op.observations/19)*100}%`}}/></div><span className="text-[11px] font-mono text-foreground">{op.observations}</span></div></td>
              </tr>
            );})}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ─── Operators View ───────────────────────────────────────────────────────────

function OperatorsView() {
  const [myProfile, setMyProfile]         = useState<MyProfile|null>(null);
  const [showJoin, setShowJoin]           = useState(false);
  const [joinName, setJoinName]           = useState("");
  const [joinExt, setJoinExt]             = useState("");
  const [showAssign, setShowAssign]       = useState(false);
  const [showLiveObs, setShowLiveObs]     = useState(false);
  const [storeSearch, setStoreSearch]     = useState("");
  const [liveObsInput, setLiveObsInput]   = useState("");

  const allStoreIds    = Object.keys(STORE_LATLNG);
  const myAssigned     = myProfile?.assignedStores  ?? [];
  const myLiveObs      = myProfile?.liveObservation ?? [];

  function initials(name: string) {
    return name.trim().split(" ").map(w=>w[0]).join("").toUpperCase().slice(0,2);
  }

  function handleJoin() {
    if (!joinName.trim()) return;
    setMyProfile({ name:joinName.trim(), extension:joinExt.trim()||"x2200", avatar:initials(joinName), status:"Available", callsWatching:0, assignedStores:[], liveObservation:[] });
    setShowJoin(false); setJoinName(""); setJoinExt("");
  }

  function toggleAssigned(id: string) {
    if (!myProfile) return;
    const cur = myProfile.assignedStores;
    const next = cur.includes(id) ? cur.filter(s=>s!==id) : cur.length < 8 ? [...cur, id] : cur;
    // if removing an assigned store, also remove from live obs
    const nextLive = myProfile.liveObservation.filter(s=>next.includes(s));
    setMyProfile({...myProfile, assignedStores:next, liveObservation:nextLive});
  }

  function toggleLiveObs(id: string) {
    if (!myProfile) return;
    const cur = myProfile.liveObservation;
    const next = cur.includes(id) ? cur.filter(s=>s!==id) : cur.length < 3 ? [...cur, id] : cur;
    setMyProfile({...myProfile, liveObservation:next});
  }

  const effectiveStatus: OperatorStatus = myProfile
    ? (myProfile.callsWatching >= 2 && myProfile.status !== "Break" ? "Busy" : myProfile.status)
    : "Available";

  const meOp: Operator|null = myProfile ? {
    id:"me", name:myProfile.name, status:effectiveStatus, onStation:true,
    assignedStores:myProfile.assignedStores, liveObservation:myProfile.liveObservation,
    observations:0, avatar:myProfile.avatar, extension:myProfile.extension, callsWatching:myProfile.callsWatching
  } : null;

  const allOps = meOp ? [meOp, ...OPERATORS.filter(o=>o.onStation)] : OPERATORS.filter(o=>o.onStation);

  const filteredStores = allStoreIds.filter(id =>
    id.toLowerCase().includes(storeSearch.toLowerCase()) ||
    (PRIORITY_STORE_DATA.find(s=>s.id===id)?.city ?? "").toLowerCase().includes(storeSearch.toLowerCase()) ||
    (OPPORTUNITY_STORE_DATA.find(s=>s.id===id)?.city ?? "").toLowerCase().includes(storeSearch.toLowerCase())
  ).slice(0, 40);

  return (
    <div>
      <PageHeader
        title="Operators"
        sub="Current shift roster — 7–8 assigned stores, up to 3 under live observation"
        action={
          <div className="flex items-center gap-2">
            {myProfile ? (
              <>
                <button onClick={()=>setShowAssign(true)} className="flex items-center gap-2 px-3 py-2 rounded-xl bg-blue-600/15 hover:bg-blue-600/25 text-blue-400 text-xs font-bold transition-colors border border-blue-500/20">
                  <Plus size={12}/>Assigned Stores
                </button>
                <button onClick={()=>setShowLiveObs(true)} disabled={myAssigned.length===0} className="flex items-center gap-2 px-3 py-2 rounded-xl bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-400 text-xs font-bold transition-colors border border-emerald-500/20 disabled:opacity-40 disabled:cursor-not-allowed">
                  <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"/>Live Obs
                </button>
                <button onClick={()=>setMyProfile(null)} className="flex items-center gap-2 px-3 py-2 rounded-xl bg-secondary hover:bg-secondary/70 text-muted-foreground text-xs font-bold transition-colors border border-border">
                  Leave Roster
                </button>
              </>
            ) : (
              <button onClick={()=>setShowJoin(true)} className="flex items-center gap-2 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold transition-colors">
                <UserPlus size={13}/>Join Roster
              </button>
            )}
          </div>
        }
      />

      {/* Join modal */}
      {showJoin && (
        <div className="fixed inset-0 z-50 flex items-center justify-center" style={{background:"rgba(0,0,0,0.6)"}}>
          <div className="rounded-2xl border border-border bg-card p-6 w-full max-w-sm shadow-2xl">
            <div className="flex items-center justify-between mb-5">
              <h3 className="text-sm font-bold text-foreground">Join the Operator Roster</h3>
              <button onClick={()=>setShowJoin(false)} className="text-muted-foreground hover:text-foreground"><X size={15}/></button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground block mb-1.5">Your Name *</label>
                <input value={joinName} onChange={e=>setJoinName(e.target.value)} placeholder="e.g. Ty Kelly" className="w-full bg-secondary/40 border border-border rounded-lg px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-blue-500/50" autoFocus/>
              </div>
              <div>
                <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground block mb-1.5">Extension</label>
                <input value={joinExt} onChange={e=>setJoinExt(e.target.value)} placeholder="e.g. x2207" className="w-full bg-secondary/40 border border-border rounded-lg px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-blue-500/50"/>
              </div>
              <p className="text-[10px] text-muted-foreground">Assign your stores after joining — up to 8 assigned, up to 3 under live observation.</p>
            </div>
            <div className="flex gap-2 mt-5">
              <button onClick={()=>setShowJoin(false)} className="flex-1 py-2 rounded-xl text-xs font-bold border border-border text-muted-foreground hover:text-foreground transition-colors">Cancel</button>
              <button onClick={handleJoin} disabled={!joinName.trim()} className="flex-1 py-2 rounded-xl text-xs font-bold bg-blue-600 hover:bg-blue-500 disabled:opacity-40 disabled:cursor-not-allowed text-white transition-colors">Join Roster</button>
            </div>
          </div>
        </div>
      )}

      {/* Assign stores modal (up to 8) */}
      {showAssign && myProfile && (
        <div className="fixed inset-0 z-50 flex items-center justify-center" style={{background:"rgba(0,0,0,0.6)"}}>
          <div className="rounded-2xl border border-border bg-card p-6 w-full max-w-md shadow-2xl flex flex-col" style={{maxHeight:"80vh"}}>
            <div className="flex items-center justify-between mb-2">
              <div>
                <h3 className="text-sm font-bold text-foreground">Assign Stores</h3>
                <p className="text-[10px] text-muted-foreground mt-0.5">{myAssigned.length}/8 selected · click to toggle</p>
              </div>
              <button onClick={()=>{setShowAssign(false);setStoreSearch("");}} className="text-muted-foreground hover:text-foreground"><X size={15}/></button>
            </div>
            {myAssigned.length > 0 && (
              <div className="flex flex-wrap gap-1 mb-3 p-2 rounded-lg bg-blue-500/5 border border-blue-500/15">
                {myAssigned.map(id=>(
                  <button key={id} onClick={()=>toggleAssigned(id)} className="flex items-center gap-1 px-2 py-0.5 rounded bg-blue-500/20 text-blue-400 text-[10px] font-mono font-bold hover:bg-red-500/20 hover:text-red-400 transition-colors">
                    {id}<X size={8}/>
                  </button>
                ))}
              </div>
            )}
            <div className="relative mb-3">
              <Search size={12} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"/>
              <input value={storeSearch} onChange={e=>setStoreSearch(e.target.value)} placeholder="Search by store ID or city..." className="w-full pl-8 pr-3 py-2 rounded-lg bg-secondary/40 border border-border text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-blue-500/50"/>
            </div>
            <div className="flex-1 overflow-y-auto grid grid-cols-2 gap-1.5 content-start">
              {filteredStores.map(id=>{
                const selected = myAssigned.includes(id);
                const atMax    = myAssigned.length >= 8 && !selected;
                const city     = PRIORITY_STORE_DATA.find(s=>s.id===id)?.city || OPPORTUNITY_STORE_DATA.find(s=>s.id===id)?.city || id;
                return (
                  <button key={id} onClick={()=>!atMax && toggleAssigned(id)} className={`flex items-center gap-2 px-2.5 py-2 rounded-lg border text-left transition-all ${selected?"border-blue-500/40 bg-blue-500/10 text-blue-400":atMax?"border-border/40 bg-secondary/10 text-muted-foreground/40 cursor-not-allowed":"border-border bg-secondary/20 text-muted-foreground hover:border-blue-500/30 hover:text-foreground"}`}>
                    <div className={`w-1.5 h-1.5 rounded-full shrink-0 ${selected?"bg-blue-400":"bg-muted-foreground/30"}`}/>
                    <div className="min-w-0">
                      <p className="text-[10px] font-bold font-mono leading-tight">{id}</p>
                      <p className="text-[9px] text-muted-foreground truncate leading-tight">{city}</p>
                    </div>
                  </button>
                );
              })}
            </div>
            <button onClick={()=>{setShowAssign(false);setStoreSearch("");}} className="mt-4 w-full py-2 rounded-xl text-xs font-bold bg-blue-600 hover:bg-blue-500 text-white transition-colors">Done</button>
          </div>
        </div>
      )}

      {/* Live observation picker */}
      {showLiveObs && myProfile && (
        <div className="fixed inset-0 z-50 flex items-center justify-center" style={{background:"rgba(0,0,0,0.6)"}}>
          <div className="rounded-2xl border border-emerald-500/20 bg-card p-6 w-full max-w-sm shadow-2xl">
            <div className="flex items-center justify-between mb-4">
              <div>
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"/>
                  <h3 className="text-sm font-bold text-foreground">Live Observation</h3>
                </div>
                <p className="text-[10px] text-muted-foreground mt-0.5">{myLiveObs.length}/3 slots active</p>
              </div>
              <button onClick={()=>{setShowLiveObs(false);setLiveObsInput("");}} className="text-muted-foreground hover:text-foreground"><X size={15}/></button>
            </div>

            {/* Current live obs chips */}
            {myLiveObs.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mb-4 p-2.5 rounded-xl bg-emerald-500/5 border border-emerald-500/15">
                {myLiveObs.map(id=>(
                  <button key={id} onClick={()=>toggleLiveObs(id)} className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-emerald-500/20 text-emerald-400 text-[10px] font-mono font-bold hover:bg-red-500/20 hover:text-red-400 border border-emerald-500/20 transition-colors">
                    <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"/>
                    {id}<X size={8} className="ml-0.5"/>
                  </button>
                ))}
              </div>
            )}

            {/* Type-in input */}
            {myLiveObs.length < 3 && (
              <div className="mb-4">
                <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground block mb-1.5">Type store ID to add</label>
                <div className="flex gap-2">
                  <input
                    value={liveObsInput}
                    onChange={e=>setLiveObsInput(e.target.value.toUpperCase())}
                    onKeyDown={e=>{
                      if (e.key==="Enter") {
                        const id = liveObsInput.trim().toUpperCase();
                        if (id && !myLiveObs.includes(id) && myLiveObs.length < 3) {
                          setMyProfile(p => {
                            if (!p) return p;
                            const newAssigned = p.assignedStores.includes(id) ? p.assignedStores : [...p.assignedStores, id];
                            return {...p, assignedStores: newAssigned, liveObservation: [...p.liveObservation, id]};
                          });
                        }
                        setLiveObsInput("");
                      }
                    }}
                    placeholder="e.g. 0042 or GA01"
                    className="flex-1 bg-secondary/40 border border-emerald-500/20 rounded-lg px-3 py-2 text-xs font-mono text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-emerald-500/50"
                    autoFocus
                  />
                  <button
                    onClick={()=>{
                      const id = liveObsInput.trim().toUpperCase();
                      if (id && !myLiveObs.includes(id) && myLiveObs.length < 3) {
                        setMyProfile(p => {
                          if (!p) return p;
                          const newAssigned = p.assignedStores.includes(id) ? p.assignedStores : [...p.assignedStores, id];
                          return {...p, assignedStores: newAssigned, liveObservation: [...p.liveObservation, id]};
                        });
                      }
                      setLiveObsInput("");
                    }}
                    disabled={!liveObsInput.trim()}
                    className="px-3 py-2 rounded-lg bg-emerald-600/70 hover:bg-emerald-600 text-white text-xs font-bold disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                  >Add</button>
                </div>
                <p className="text-[9px] text-muted-foreground mt-1">Press Enter or click Add · unknown IDs are added to your assigned stores automatically</p>
              </div>
            )}

            {/* Assigned stores quick-select */}
            {myAssigned.length > 0 && (
              <div>
                <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-2">Or pick from assigned</p>
                <div className="space-y-1 max-h-52 overflow-y-auto">
                  {myAssigned.map(id=>{
                    const selected = myLiveObs.includes(id);
                    const atMax    = myLiveObs.length >= 3 && !selected;
                    const city     = PRIORITY_STORE_DATA.find(s=>s.id===id)?.city || OPPORTUNITY_STORE_DATA.find(s=>s.id===id)?.city || id;
                    return (
                      <button key={id} onClick={()=>!atMax && toggleLiveObs(id)} className={`w-full flex items-center gap-3 px-3 py-2 rounded-xl border text-left transition-all ${selected?"border-emerald-500/40 bg-emerald-500/10":atMax?"border-border/40 bg-secondary/10 opacity-40 cursor-not-allowed":"border-border bg-secondary/20 hover:border-emerald-500/30"}`}>
                        <div className={`w-1.5 h-1.5 rounded-full shrink-0 ${selected?"bg-emerald-400 shadow-[0_0_6px_#34d399]":"bg-muted-foreground/30"}`}/>
                        <div className="flex-1 min-w-0">
                          <p className={`text-[10px] font-bold font-mono ${selected?"text-emerald-400":"text-foreground"}`}>{id}</p>
                          <p className="text-[9px] text-muted-foreground truncate">{city}</p>
                        </div>
                        {selected && <span className="text-[8px] font-bold text-emerald-400 bg-emerald-500/10 px-1.5 py-0.5 rounded">LIVE</span>}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            <button onClick={()=>{setShowLiveObs(false);setLiveObsInput("");}} className="mt-4 w-full py-2 rounded-xl text-xs font-bold bg-emerald-600/80 hover:bg-emerald-600 text-white transition-colors">Confirm</button>
          </div>
        </div>
      )}

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-5">
        <StatCard label="On Shift"    value={allOps.filter(o=>o.onStation).length}                color="bg-blue-500/20 text-blue-400"       icon={Users}/>
        <StatCard label="Available"   value={allOps.filter(o=>o.status==="Available").length}     color="bg-emerald-500/20 text-emerald-400"  icon={CheckCircle}/>
        <StatCard label="Busy"        value={allOps.filter(o=>o.status==="Busy").length}          color="bg-red-500/20 text-red-400"          icon={Activity}/>
        <StatCard label="Live Obs"    value={allOps.reduce((n,o)=>n+o.liveObservation.length,0)}  color="bg-emerald-500/20 text-emerald-400"  icon={Eye}/>
      </div>

      {/* ── Store Coverage Board ───────────────────────────────────────────────── */}
      {(() => {
        const liveSet     = new Set(allOps.flatMap(o=>o.liveObservation));
        const assignedSet = new Set(allOps.flatMap(o=>o.assignedStores));
        const allIds      = Object.keys(STORE_LATLNG);
        const liveCount   = allIds.filter(id=>liveSet.has(id)).length;
        const assignedOnly= allIds.filter(id=>assignedSet.has(id)&&!liveSet.has(id)).length;
        const unwatched   = allIds.filter(id=>!assignedSet.has(id)).length;
        return (
          <div className="rounded-2xl border border-border bg-card p-5 mb-5">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Eye size={14} className="text-blue-400"/>
                <h2 className="text-sm font-bold text-foreground uppercase tracking-wider">Store Coverage</h2>
              </div>
              <div className="flex items-center gap-4 text-[10px] font-semibold">
                <span className="flex items-center gap-1.5"><div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"/><span className="text-emerald-400">Live Obs ({liveCount})</span></span>
                <span className="flex items-center gap-1.5"><div className="w-2 h-2 rounded-full bg-blue-400"/><span className="text-blue-400">Assigned ({assignedOnly})</span></span>
                <span className="flex items-center gap-1.5"><div className="w-2 h-2 rounded-full bg-slate-600"/><span className="text-muted-foreground">Unmonitored ({unwatched})</span></span>
              </div>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {allIds.map(id=>{
                const isLive     = liveSet.has(id);
                const isAssigned = assignedSet.has(id);
                const city       = PRIORITY_STORE_DATA.find(s=>s.id===id)?.city || OPPORTUNITY_STORE_DATA.find(s=>s.id===id)?.city || "";
                return (
                  <div
                    key={id}
                    title={city ? `${id} · ${city}` : id}
                    className={`flex items-center gap-1 px-2 py-1 rounded-lg border text-[9px] font-mono font-bold transition-all cursor-default ${
                      isLive
                        ? "bg-emerald-500/15 border-emerald-500/35 text-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.2)]"
                        : isAssigned
                          ? "bg-blue-500/10 border-blue-500/25 text-blue-400"
                          : "bg-secondary/30 border-border/40 text-muted-foreground/50"
                    }`}
                  >
                    {isLive && <div className="w-1 h-1 rounded-full bg-emerald-400 animate-pulse shrink-0"/>}
                    {id}
                  </div>
                );
              })}
            </div>
          </div>
        );
      })()}

      {/* My profile banner */}
      {myProfile && (
        <div className="rounded-2xl border border-blue-500/30 bg-blue-500/5 p-4 mb-5 flex flex-col gap-3">
          <div className="flex items-center gap-3 flex-wrap">
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-blue-700 flex items-center justify-center text-sm font-bold text-white shrink-0">{myProfile.avatar}</div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <p className="text-sm font-bold text-foreground">{myProfile.name}</p>
                <span className="text-[9px] font-bold bg-blue-500 text-white px-1.5 py-0.5 rounded">YOU</span>
                <div className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md ${opCfg(effectiveStatus).bg}`}>
                  <div className={`w-1.5 h-1.5 rounded-full ${opCfg(effectiveStatus).dot}`}/>
                  <span className={`text-[11px] font-bold ${opCfg(effectiveStatus).color}`}>{effectiveStatus}</span>
                </div>
                <span className="text-xs font-mono text-muted-foreground">{myProfile.extension}</span>
              </div>
            </div>
            <div className="flex gap-2 shrink-0">
              <button onClick={()=>setShowAssign(true)} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-secondary hover:bg-secondary/70 text-xs font-semibold text-muted-foreground border border-border transition-colors">
                <Plus size={11}/>Stores ({myAssigned.length}/8)
              </button>
              <button onClick={()=>setShowLiveObs(true)} disabled={myAssigned.length===0} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-500/10 hover:bg-emerald-500/20 text-xs font-semibold text-emerald-400 border border-emerald-500/20 transition-colors disabled:opacity-40 disabled:cursor-not-allowed">
                <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"/>Live ({myLiveObs.length}/3)
              </button>
            </div>
          </div>
          {myAssigned.length > 0 && (
            <div className="flex flex-wrap gap-1 pt-2 border-t border-border/50">
              {myAssigned.map(id=>{
                const isLive = myLiveObs.includes(id);
                return <StoreTag key={id} id={id} color={isLive?"bg-emerald-500/15 text-emerald-400":"bg-secondary/60 text-muted-foreground"}/>;
              })}
            </div>
          )}
          {myAssigned.length === 0 && <p className="text-[10px] text-muted-foreground pt-1 border-t border-border/50">No stores assigned yet — click Stores to add up to 8.</p>}
        </div>
      )}

      {/* Table */}
      <div className="rounded-2xl border border-border bg-card overflow-x-auto mb-5">
        <table className="w-full text-xs">
          <thead><tr className="border-b border-border">{["Operator","Ext.","Status","Assigned","Live Observation","Obs.",""].map(h=><th key={h} className="text-left px-4 py-3 text-[10px] font-bold tracking-widest text-muted-foreground uppercase whitespace-nowrap">{h}</th>)}</tr></thead>
          <tbody>{allOps.filter(op=>op.onStation).map((op,i)=>{
            const isMe=op.id==="me"; const sc=opCfg(op.status); const Icon=sc.Icon;
            const offStation=false;
            return(
              <tr key={op.id} className={`border-b border-border/50 transition-colors ${isMe?"bg-blue-500/5 hover:bg-blue-500/10":"hover:bg-blue-500/5"+(i%2===0?"":" bg-white/[0.02]")}`}>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2">
                    <div className={`w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-bold text-white shrink-0 ${isMe?"bg-gradient-to-br from-blue-500 to-blue-700":"bg-gradient-to-br from-blue-600 to-blue-800"}`}>{op.avatar}</div>
                    <span className="font-semibold text-foreground">{op.name}</span>
                    {isMe&&<span className="text-[9px] font-bold bg-blue-500 text-white px-1 py-0.5 rounded">YOU</span>}
                  </div>
                </td>
                <td className="px-4 py-3"><span className="font-mono text-blue-400 font-semibold text-[11px]">{op.extension}</span></td>
                <td className="px-4 py-3">
                  <div className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md ${sc.bg}`}><Icon size={9} className={sc.color}/><span className={`text-[10px] font-semibold ${sc.color}`}>{op.status}</span></div>
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-1">
                    <span className="text-[10px] font-mono font-bold text-foreground">{op.assignedStores.length}</span>
                    <span className="text-[9px] text-muted-foreground">stores</span>
                  </div>
                </td>
                <td className="px-4 py-3">
                  <div className="flex flex-wrap gap-1">
                    {op.liveObservation.length > 0
                      ? op.liveObservation.map(s=><span key={s} className="flex items-center gap-1 px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-400 text-[9px] font-mono font-bold border border-emerald-500/20"><div className="w-1 h-1 rounded-full bg-emerald-400 animate-pulse"/>{s}</span>)
                      : <span className="text-[9px] text-muted-foreground italic">None</span>
                    }
                  </div>
                </td>
                <td className="px-4 py-3 font-bold font-mono text-foreground">{op.observations}</td>
                <td className="px-4 py-3">
                  {isMe ? (
                    <button onClick={()=>setShowAssign(true)} className="flex items-center gap-1 px-2 py-1 rounded-lg bg-blue-600/15 hover:bg-blue-600/25 text-blue-400 text-[10px] font-semibold border border-blue-500/20 transition-colors"><Plus size={9}/>Stores</button>
                  ) : (
                    <button className="flex items-center gap-1 px-2 py-1 rounded-lg bg-blue-600/15 hover:bg-blue-600/25 text-blue-400 text-[10px] font-semibold border border-blue-500/20 transition-colors"><Phone size={9}/>Call</button>
                  )}
                </td>
              </tr>
          );})}
          </tbody>
        </table>
      </div>

      {/* Cards grid — on-station operators only */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-5 gap-4">
        {meOp && <OperatorCard key="me" op={meOp} isMe/>}
        {OPERATORS.filter(op=>op.onStation).map(op=><OperatorCard key={op.id} op={op}/>)}
      </div>
    </div>
  );
}

// ─── Settings View ────────────────────────────────────────────────────────────

function SettingsView() {
  const [notifSound,setNotifSound] = useState(true);
  const [autoAssign,setAutoAssign] = useState(false);
  const [dataminrEnabled,setDataminrEnabled] = useState(true);
  return (
    <div>
      <PageHeader title="Settings" sub="System configuration and preferences"/>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        <div className="lg:col-span-2 space-y-4">
          {[{label:"Notification Sounds",desc:"Play audio alert on new critical incident",val:notifSound,set:setNotifSound},{label:"Auto-Assign Incidents",desc:"Automatically assign new incidents to available operators",val:autoAssign,set:setAutoAssign},{label:"Dataminr Integration",desc:"Receive real-time intelligence alerts from Dataminr",val:dataminrEnabled,set:setDataminrEnabled}].map(item=>(
            <div key={item.label} className="rounded-2xl border border-border bg-card p-5 flex items-center justify-between">
              <div><p className="text-sm font-semibold text-foreground">{item.label}</p><p className="text-xs text-muted-foreground mt-0.5">{item.desc}</p></div>
              <button onClick={()=>item.set(!item.val)} className={`relative w-11 h-6 rounded-full transition-colors ${item.val?"bg-blue-600":"bg-secondary"}`}><span className={`absolute top-1 w-4 h-4 rounded-full bg-white shadow transition-all ${item.val?"left-6":"left-1"}`}/></button>
            </div>
          ))}
          <div className="rounded-2xl border border-border bg-card p-5">
            <p className="text-sm font-semibold text-foreground mb-1">Alert Escalation Threshold</p>
            <p className="text-xs text-muted-foreground mb-3">Auto-escalate to supervisor after this many minutes without acknowledgment</p>
            <div className="flex items-center gap-3">{[5,10,15,30].map(v=><button key={v} className="px-4 py-2 rounded-xl text-xs font-semibold border border-border bg-secondary hover:bg-blue-600/20 hover:text-blue-400 hover:border-blue-500/30 text-secondary-foreground transition-colors">{v} min</button>)}</div>
          </div>
        </div>
        <div className="space-y-4">
          <div className="rounded-2xl border border-border bg-card p-5">
            <p className="text-xs font-bold tracking-widest text-muted-foreground uppercase mb-3">System Info</p>
            {[["Version","SOC v2.4.1"],["Last Sync","14:34:02"],["DB Status","Connected"],["API Status","Online"]].map(([k,v])=>(
              <div key={k} className="flex items-center justify-between py-2 border-b border-border last:border-0"><span className="text-xs text-muted-foreground">{k}</span><span className="text-xs font-mono font-semibold text-emerald-400">{v}</span></div>
            ))}
          </div>
          <div className="rounded-2xl border border-border bg-card p-5">
            <p className="text-xs font-bold tracking-widest text-muted-foreground uppercase mb-3">Quick Links</p>
            {["Incident Report Template","BOLO Submission Form","Operator Schedule","Vendor Contacts"].map(l=>(
              <button key={l} className="w-full flex items-center justify-between py-2.5 text-xs text-foreground hover:text-blue-400 transition-colors border-b border-border last:border-0">{l}<FileText size={12} className="text-muted-foreground"/></button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Store Map View ───────────────────────────────────────────────────────────

function StoreMapView() {
  const [selectedStore, setSelectedStore] = useState<string|null>(null);
  const [activeBolo, setActiveBolo]       = useState<string|null>(null);
  const [pinnedStore, setPinnedStore]     = useState<string|null>(null);

  const PROX_KM = 100;

  function nearbyOf(lastStore: string): string[] {
    const o = STORE_LATLNG[lastStore];
    if (!o) return [];
    return Object.entries(STORE_LATLNG)
      .filter(([id,ll]) => id!==lastStore && distKm(o,ll) <= PROX_KM)
      .map(([id]) => id);
  }

  function projectedRoutesFor(storeId: string) {
    const ll = STORE_LATLNG[storeId];
    if (!ll) return [];
    return ORC_CORRIDORS
      .map(r => {
        const minDist = r.coords.reduce((min, wp) => Math.min(min, distKm(ll, wp)), Infinity);
        if (minDist > 80) return null;
        // Closer = higher probability; scale from baseProb down by distance
        const distFactor = Math.max(0, 1 - minDist / 120);
        const prob = Math.round(r.baseProb * (0.4 + 0.6 * distFactor));
        return { ...r, prob, minDist };
      })
      .filter((r): r is NonNullable<typeof r> => r !== null)
      .sort((a, b) => b.prob - a.prob);
  }

  const boloActive   = activeBolo ? BOLO_PEOPLE.find(b=>b.id===activeBolo) : null;
  const nearby       = boloActive ? nearbyOf(boloActive.lastStore) : [];
  const projRoutes   = boloActive ? projectedRoutesFor(boloActive.lastStore) : [];
  const boloFlyPos   = boloActive ? (STORE_LATLNG[boloActive.lastStore] ?? null) : null;
  const pinnedRoutes = pinnedStore ? projectedRoutesFor(pinnedStore) : [];
  const allIds       = Object.keys(STORE_LATLNG);

  const STATE_CITY: Record<string,string> = {
    GA01:"Atlanta, GA",GA02:"Savannah, GA",GA03:"Brunswick, GA",GA04:"Athens, GA",GA05:"Columbus, GA",
    GA06:"Gainesville, GA",GA07:"Macon, GA",GA08:"Albany, GA",GA09:"Dalton, GA",GA10:"Warner Robins, GA",
    GA11:"Waycross, GA",GA12:"Augusta, GA",GA13:"Canton, GA",GA14:"Dublin, GA",GA15:"Valdosta, GA",
    GA16:"Griffin, GA",GA17:"Tifton, GA",GA18:"Blue Ridge, GA",GA19:"Statesboro, GA",GA20:"Newnan, GA",
    GA21:"Woodstock, GA",GA22:"Milledgeville, GA",GA23:"Hinesville, GA",GA24:"Thomson, GA",
    GA25:"Cornelia, GA",GA26:"Thomasville, GA",GA27:"Eatonton, GA",
    AL01:"Birmingham, AL",AL02:"Montgomery, AL",AL03:"Mobile, AL",AL04:"Huntsville, AL",AL05:"Tuscaloosa, AL",
    AL06:"Dothan, AL",AL07:"Cullman, AL",AL08:"Meridian, AL",AL09:"Jasper, AL",AL10:"Gadsden, AL",
    AL11:"Gulf Shores, AL",AL12:"Greenville, AL",AL13:"Anniston, AL",AL14:"Florence, AL",AL15:"Auburn, AL",
    AL16:"Talladega, AL",AL17:"Demopolis, AL",AL18:"Prattville, AL",AL19:"Decatur, AL",AL20:"Foley, AL",
    SC01:"Columbia, SC",SC02:"Charleston, SC",SC03:"Myrtle Beach, SC",SC04:"Greenville, SC",SC05:"Sumter, SC",
    SC06:"Florence, SC",SC07:"Aiken, SC",SC08:"Anderson, SC",SC09:"Conway, SC",SC10:"Hartsville, SC",
    SC11:"Orangeburg, SC",SC12:"Seneca, SC",SC13:"Gaffney, SC",SC14:"Walterboro, SC",SC15:"Dillon, SC",
    NC01:"Charlotte, NC",NC02:"Raleigh, NC",NC03:"Greensboro, NC",NC04:"Wilmington, NC",NC05:"Kinston, NC",
    NC06:"Hickory, NC",NC07:"Winston-Salem, NC",NC08:"Fayetteville, NC",NC09:"Asheville, NC",
    NC10:"Elizabeth City, NC",NC11:"Sanford, NC",NC12:"Martinsville, NC",NC13:"Burlington, NC",
    NC14:"New Bern, NC",NC15:"Concord, NC",NC16:"Boone, NC",NC17:"Shelby, NC",NC18:"Durham, NC",
    NC19:"Goldsboro, NC",NC20:"Rocky Mount, NC",
    TN01:"Memphis, TN",TN02:"Nashville, TN",TN03:"Chattanooga, TN",TN04:"Knoxville, TN",TN05:"Kingsport, TN",
    TN06:"Jackson, TN",TN07:"Union City, TN",TN08:"Murfreesboro, TN",TN09:"Oak Ridge, TN",
    TN10:"Clarksville, TN",TN11:"Bartlett, TN",TN12:"Columbia, TN",TN13:"Crossville, TN",
    TN14:"McMinnville, TN",TN15:"Lewisburg, TN",TN16:"Paris, TN",TN17:"Maryville, TN",TN18:"Johnson City, TN",
    MS01:"Jackson, MS",MS02:"Gulfport, MS",MS03:"Tupelo, MS",MS04:"Meridian, MS",MS05:"Biloxi, MS",
    MS06:"Hattiesburg, MS",MS07:"Columbus, MS",MS08:"Laurel, MS",MS09:"Brookhaven, MS",MS10:"Grenada, MS",
    MS11:"Corinth, MS",MS12:"Pascagoula, MS",MS13:"Vicksburg, MS",MS14:"Natchez, MS",MS15:"Southaven, MS",
    TX01:"Houston, TX",TX02:"San Antonio, TX",TX03:"Dallas, TX",TX04:"Austin, TX",TX05:"McAllen, TX",
    TX06:"Corpus Christi, TX",TX07:"Waco, TX",TX08:"Lubbock, TX",TX09:"El Paso, TX",TX10:"Stafford, TX",
    TX11:"Spring, TX",TX12:"Harlingen, TX",TX13:"Mansfield, TX",TX14:"Denton, TX",TX15:"Round Rock, TX",
    TX16:"Corsicana, TX",TX17:"Beaumont, TX",TX18:"Lumberton, TX",TX19:"Tyler, TX",TX20:"Killeen, TX",
    TX21:"Del Rio, TX",TX22:"Texarkana, TX",TX23:"Bryan, TX",TX24:"Uvalde, TX",TX25:"Longview, TX",
    TX26:"Katy, TX",TX27:"College Station, TX",
    VA01:"Richmond, VA",VA02:"Norfolk, VA",VA03:"Arlington, VA",VA04:"Roanoke, VA",VA05:"Chesapeake, VA",
    VA06:"Lynchburg, VA",VA07:"Emporia, VA",VA08:"Hampton, VA",VA09:"Fredericksburg, VA",
    VA10:"Charlottesville, VA",VA11:"Virginia Beach, VA",
    LA01:"New Orleans, LA",LA02:"Baton Rouge, LA",LA03:"Shreveport, LA",LA04:"Lake Charles, LA",LA05:"Alexandria, LA",
    LA06:"Lafayette, LA",LA07:"Gonzales, LA",LA08:"Houma, LA",LA09:"Natchitoches, LA",LA10:"Venice, LA",
    LA11:"Opelousas, LA",LA12:"Monroe, LA",
    AR01:"Little Rock, AR",AR02:"Fort Smith, AR",AR03:"Jonesboro, AR",AR04:"Pine Bluff, AR",AR05:"Hot Springs, AR",
    AR06:"Fayetteville, AR",AR07:"Conway, AR",AR08:"Arkadelphia, AR",AR09:"Russellville, AR",AR10:"Dumas, AR",
    AR11:"Rogers, AR",AR12:"Batesville, AR",AR13:"Benton, AR",AR14:"Searcy, AR",
    KY01:"Louisville, KY",KY02:"Lexington, KY",KY03:"Paducah, KY",KY04:"Bowling Green, KY",KY05:"Owensboro, KY",
    KY06:"Florence, KY",KY07:"Richmond, KY",KY08:"Glasgow, KY",KY09:"Ashland, KY",KY10:"Hazard, KY",
    KY11:"Morehead, KY",KY12:"Murray, KY",
    OK01:"Oklahoma City, OK",OK02:"Tulsa, OK",OK03:"Elk City, OK",OK04:"Lawton, OK",OK05:"Enid, OK",
    OK06:"Amarillo area, OK",OK07:"Ardmore, OK",OK08:"Muskogee, OK",OK09:"Miami, OK",OK10:"Norman, OK",OK11:"McAlester, OK",
    MO01:"St. Louis, MO",MO02:"Springfield, MO",MO03:"Branson, MO",MO04:"Columbia, MO",MO05:"Kansas City, MO",
    MO06:"Rolla, MO",MO07:"Cape Girardeau, MO",MO08:"Jefferson City, MO",MO09:"Joplin, MO",
    MO10:"Lee's Summit, MO",MO11:"Carthage, MO",
    MD01:"Baltimore, MD",MD02:"Annapolis, MD",MD03:"Salisbury, MD",MD04:"Frederick, MD",MD05:"Easton, MD",
  };

  function catOf(id: string): "priority"|"opportunity"|"watchlist" {
    if (PRIORITY_STORE_DATA.find(s=>s.id===id))   return "priority";
    if (OPPORTUNITY_STORE_DATA.find(s=>s.id===id)) return "opportunity";
    if (WATCH_LIST_DATA.find(s=>s.id===id))        return "watchlist";
    return "watchlist";
  }
  function cityOf(id: string) {
    return PRIORITY_STORE_DATA.find(s=>s.id===id)?.city
        || OPPORTUNITY_STORE_DATA.find(s=>s.id===id)?.city
        || WATCH_LIST_DATA.find(s=>s.id===id)?.city
        || STATE_CITY[id] || id;
  }
  function pinColor(id: string): string {
    if (boloActive?.lastStore === id) return "#F97316";
    if (nearby.includes(id))          return "#EF4444";
    const c = catOf(id);
    if (c==="priority")   return "#EF4444";
    if (c==="opportunity") return "#EAB308";
    return "#3B82F6";
  }

  return (
    <>
      {selectedStore && <StoreLocatorPanel storeId={selectedStore} onClose={()=>setSelectedStore(null)}/>}
      <div className="flex flex-col" style={{height:"calc(100vh - 112px)"}}>
        <PageHeader
          title="Store Map"
          sub={`${allIds.length} FL store locations · Zoom/pan across Southeast · Select BOLO for ORC route projection`}
          action={
            <div className="flex items-center gap-3 flex-wrap">
              {[
                {c:"#EF4444",l:"Priority / BOLO Nearby"},
                {c:"#EAB308",l:"Opportunity"},
                {c:"#3B82F6",l:"Watch List"},
                {c:"#F97316",l:"BOLO Last Seen"},
              ].map(({c,l})=>(
                <div key={l} className="flex items-center gap-1.5">
                  <svg width="9" height="12" viewBox="0 0 20 27">
                    <path d="M10,0 C4.5,0 0,4.5 0,10 C0,18 10,27 10,27 C10,27 20,18 20,10 C20,4.5 15.5,0 10,0 Z" fill={c}/>
                    <circle cx="10" cy="10" r="3.5" fill="rgba(255,255,255,0.9)"/>
                  </svg>
                  <span className="text-[10px] text-muted-foreground">{l}</span>
                </div>
              ))}
            </div>
          }
        />

        <div className="flex gap-4 flex-1 min-h-0 overflow-hidden">

          {/* ── Leaflet Map ── */}
          <div className="flex-1 rounded-2xl border border-border overflow-hidden relative" style={{minHeight:0}}>

            {/* ORC route legend overlay — only when BOLO active */}
            {boloActive && projRoutes.length>0 && (
              <div className="absolute top-3 left-3 z-[1000] rounded-xl border border-orange-500/30 p-3 max-w-[230px]" style={{background:"rgba(15,23,42,0.92)",backdropFilter:"blur(8px)"}}>
                <div className="flex items-center gap-2 mb-2">
                  <AlertTriangle size={11} className="text-orange-400 shrink-0"/>
                  <span className="text-[10px] font-bold text-orange-400 uppercase tracking-wider">Projected ORC Routes</span>
                </div>
                <div className="space-y-2.5">
                  {projRoutes.map(r=>{
                    const pc = r.prob>=80?"#EF4444":r.prob>=65?"#F97316":r.prob>=50?"#EAB308":"#3B82F6";
                    return (
                      <div key={r.id}>
                        <div className="flex items-center justify-between mb-0.5">
                          <div className="flex items-center gap-1.5">
                            <div className="w-1.5 h-1.5 rounded-full shrink-0" style={{background:r.color}}/>
                            <p className="text-[10px] font-bold text-foreground leading-tight">{r.name}</p>
                          </div>
                          <span className="text-[10px] font-mono font-bold ml-2 shrink-0" style={{color:pc}}>{r.prob}%</span>
                        </div>
                        <div className="w-full h-0.5 rounded-full bg-white/10">
                          <div className="h-0.5 rounded-full" style={{width:`${r.prob}%`,background:pc}}/>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {boloActive && (
              <div className="absolute top-3 right-3 z-[1000] flex items-center gap-2 px-3 py-1.5 rounded-lg border border-orange-500/30" style={{background:"rgba(15,23,42,0.92)",backdropFilter:"blur(8px)"}}>
                <span className="w-1.5 h-1.5 rounded-full bg-orange-500 animate-pulse"/>
                <span className="text-[11px] font-bold text-orange-400">{boloActive.caseId} active</span>
                <span className="text-[10px] text-orange-300">· {nearby.length} stores · {projRoutes.length} routes</span>
                <button onClick={()=>setActiveBolo(null)} className="text-orange-400 hover:text-foreground ml-1"><X size={11}/></button>
              </div>
            )}

            <MapContainer
              center={[27.8, -83.0]}
              zoom={7}
              style={{height:"100%",width:"100%"}}
              zoomControl
            >
              <MapFlyTo pos={boloFlyPos}/>

              <TileLayer
                url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
                subdomains="abcd"
                maxZoom={19}
              />

              {/* All corridors — faded background */}
              {ORC_CORRIDORS.map(r=>(
                <Polyline
                  key={r.id+"-bg"}
                  positions={r.coords}
                  pathOptions={{color:r.color, weight:1.5, opacity:0.15, dashArray:"5 6"}}
                />
              ))}

              {/* BOLO projected corridors — highlighted */}
              {projRoutes.map(r=>(
                <Polyline
                  key={r.id+"-active"}
                  positions={r.coords}
                  pathOptions={{color:r.color, weight:4.5, opacity:0.88, dashArray:"12 7"}}
                />
              ))}

              {/* Pinned store corridors — bright solid highlight */}
              {pinnedRoutes.map(r=>(
                <Polyline
                  key={r.id+"-pinned"}
                  positions={r.coords}
                  pathOptions={{color:r.color, weight:6, opacity:1, dashArray:undefined}}
                />
              ))}

              {/* BOLO proximity circle */}
              {boloActive && STORE_LATLNG[boloActive.lastStore] && (
                <LeafletCircle
                  center={STORE_LATLNG[boloActive.lastStore]}
                  radius={PROX_KM * 1000}
                  pathOptions={{color:"#EF4444", fillColor:"#EF4444", fillOpacity:0.04, weight:2, dashArray:"8 5"}}
                />
              )}

              {/* Store markers */}
              {allIds.map(id => {
                const ll       = STORE_LATLNG[id];
                if (!ll) return null;
                const isBolo   = boloActive?.lastStore === id;
                const isNearby = nearby.includes(id);
                const isPinned = pinnedStore === id;
                const fill     = pinColor(id);
                const priSt    = PRIORITY_STORE_DATA.find(s=>s.id===id)?.status;
                const size     = isBolo ? 28 : isPinned ? 26 : isNearby ? 23 : 19;
                const icon     = createPinIcon(fill, isBolo||isNearby||isPinned, size);

                return (
                  <Marker
                    key={id}
                    position={ll}
                    icon={icon}
                    eventHandlers={{click:()=>setPinnedStore(isPinned ? null : id)}}
                    zIndexOffset={isBolo?1000:isPinned?900:isNearby?500:0}
                  />
                );
              })}
            </MapContainer>
          </div>

          {/* ── Side Panel ── */}
          <div className="w-72 shrink-0 flex flex-col gap-3 overflow-y-auto pb-2">

            {/* Pinned store card */}
            {pinnedStore && (()=>{
              const ps       = pinnedStore;
              const pFill    = pinColor(ps);
              const pCat     = catOf(ps);
              const pCity    = cityOf(ps);
              const pPriSt   = PRIORITY_STORE_DATA.find(s=>s.id===ps)?.status;
              const pRoutes  = pinnedRoutes;
              const pIsBolo  = boloActive?.lastStore === ps;
              const pNearby  = nearby.includes(ps);
              return (
                <div className="rounded-2xl border bg-card p-4 shrink-0 animate-in fade-in slide-in-from-top-2 duration-200" style={{borderColor:pFill+"55"}}>
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{background:pFill}}/>
                      <div>
                        <p className="text-sm font-bold text-foreground">#{ps}</p>
                        <p className="text-[10px] text-muted-foreground">{pCity}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <span className="text-[9px] font-bold uppercase px-1.5 py-0.5 rounded" style={{background:pFill+"22",color:pFill}}>{pCat}</span>
                      <button onClick={()=>setPinnedStore(null)} className="text-muted-foreground hover:text-foreground transition-colors"><X size={12}/></button>
                    </div>
                  </div>

                  {pPriSt && (
                    <div className={`text-[10px] font-semibold mb-2 px-2 py-1 rounded-md ${pPriSt==="incident"?"bg-red-500/10 text-red-400":pPriSt==="monitoring"?"bg-blue-500/10 text-blue-400":"bg-green-500/10 text-green-400"}`}>
                      {pPriSt==="incident"?"● Active Incident":pPriSt==="monitoring"?"● Monitoring":"✓ Clear"}
                    </div>
                  )}
                  {pIsBolo && <div className="text-[10px] font-semibold mb-2 px-2 py-1 rounded-md bg-orange-500/10 text-orange-400">⚠ BOLO Last Seen Here · {boloActive?.caseId}</div>}
                  {pNearby  && <div className="text-[10px] font-semibold mb-2 px-2 py-1 rounded-md bg-red-500/10 text-red-400">⚠ In BOLO Proximity Zone</div>}

                  {pRoutes.length > 0 ? (
                    <>
                      <p className="text-[9px] text-muted-foreground uppercase tracking-wider font-bold mb-2">Projected ORC Routes</p>
                      <div className="space-y-2.5">
                        {pRoutes.map(r=>{
                          const probColor = r.prob>=80?"#EF4444":r.prob>=65?"#F97316":r.prob>=50?"#EAB308":"#3B82F6";
                          const probLabel = r.prob>=80?"Very High":r.prob>=65?"High":r.prob>=50?"Moderate":"Lower";
                          return (
                            <div key={r.id}>
                              <div className="flex items-center justify-between mb-1">
                                <div className="flex items-center gap-1.5">
                                  <div className="w-2.5 h-0.5 rounded" style={{background:r.color}}/>
                                  <span className="text-[10px] font-semibold text-foreground leading-tight">{r.name}</span>
                                </div>
                                <div className="flex items-center gap-1 shrink-0">
                                  <span className="text-[9px] font-bold" style={{color:probColor}}>{probLabel}</span>
                                  <span className="text-[10px] font-mono font-bold" style={{color:probColor}}>{r.prob}%</span>
                                </div>
                              </div>
                              <div className="w-full h-1 rounded-full bg-secondary">
                                <div className="h-1 rounded-full transition-all" style={{width:`${r.prob}%`,background:probColor}}/>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                      <p className="text-[9px] text-muted-foreground mt-2 leading-relaxed">Probability based on route proximity, ORC activity history, and corridor usage patterns.</p>
                    </>
                  ) : (
                    <p className="text-[10px] text-muted-foreground">No major ORC corridors within 80km of this location.</p>
                  )}

                  <button
                    onClick={()=>setSelectedStore(ps)}
                    className="mt-3 w-full py-1.5 rounded-lg text-[10px] font-bold text-white transition-colors"
                    style={{background:pFill}}
                  >
                    Open Full Store Details →
                  </button>
                </div>
              );
            })()}

            {/* BOLO selector */}
            <div className="rounded-2xl border border-orange-500/20 bg-card p-4 shrink-0">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-orange-500 animate-pulse"/>
                  <span className="text-xs font-bold text-foreground uppercase tracking-wider">BOLO + ORC Routes</span>
                </div>
                <Chip className="bg-orange-500/15 text-orange-400">{BOLO_PEOPLE.length} active</Chip>
              </div>
              <p className="text-[10px] text-muted-foreground mb-3 leading-relaxed">Select a BOLO to see nearby stores and projected interstate ORC routes from their last location.</p>
              <div className="space-y-2">
                {BOLO_PEOPLE.map(b => {
                  const isActive = activeBolo === b.id;
                  const n = nearbyOf(b.lastStore).length;
                  const routes = projectedRoutesFor(b.lastStore);
                  return (
                    <button
                      key={b.id}
                      onClick={()=>setActiveBolo(isActive ? null : b.id)}
                      className={`w-full flex items-center gap-2.5 p-2.5 rounded-xl text-left transition-all ${isActive?"bg-orange-500/15 border border-orange-500/30":"bg-secondary/40 border border-border hover:border-orange-500/20 hover:bg-orange-500/5"}`}
                    >
                      <img src={b.photo} alt={b.label} className="w-10 h-10 rounded-lg object-cover object-top shrink-0" style={{filter:"grayscale(0.6) brightness(0.8)"}}/>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5 mb-0.5">
                          <span className="text-[10px] font-bold text-orange-400 font-mono">{b.caseId}</span>
                          {isActive && <span className="text-[8px] font-bold bg-orange-500 text-white px-1 py-0.5 rounded-sm leading-none">ON</span>}
                        </div>
                        <p className="text-[11px] text-foreground font-semibold truncate">{b.label}</p>
                        <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                          <span className="text-[9px] font-mono text-muted-foreground">#{b.lastStore}</span>
                          <span className={`text-[9px] font-bold ${n>0?"text-orange-400":"text-muted-foreground"}`}>{n} nearby</span>
                          <span className="text-[9px] text-muted-foreground">{routes.length} routes</span>
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Proximity store results */}
            {boloActive && (
              <div className={`rounded-2xl border p-4 shrink-0 ${nearby.length>0?"border-red-500/20 bg-red-500/5":"border-border bg-card"}`}>
                <div className="flex items-center gap-2 mb-2">
                  <AlertTriangle size={12} className={nearby.length>0?"text-red-400":"text-muted-foreground"}/>
                  <span className="text-xs font-bold text-foreground uppercase tracking-wider">
                    {nearby.length>0 ? `${nearby.length} Stores In Zone` : "No Stores In Zone"}
                  </span>
                </div>
                {nearby.length>0 ? (
                  <>
                    <p className="text-[10px] text-muted-foreground mb-2 leading-relaxed">
                      <span className="text-orange-400 font-bold">{boloActive.caseId}</span> · last seen <span className="font-mono text-foreground">#{boloActive.lastStore}</span> · {boloActive.date}
                    </p>
                    <div className="space-y-1.5 mb-3">
                      {nearby.map(id => {
                        const c = catOf(id);
                        const d = STORE_DETAILS.find(s=>s.id===id);
                        return (
                          <button key={id} onClick={()=>setSelectedStore(id)} className="w-full flex items-center justify-between p-2 rounded-lg bg-red-500/10 hover:bg-red-500/20 border border-red-500/15 transition-colors text-left">
                            <div className="flex items-center gap-2">
                              <div className={`w-1.5 h-1.5 rounded-full shrink-0 ${c==="priority"?"bg-red-400":c==="opportunity"?"bg-yellow-400":"bg-blue-400"}`}/>
                              <span className="text-[11px] font-mono font-bold text-foreground">#{id}</span>
                              <span className="text-[11px] text-muted-foreground">{cityOf(id)}</span>
                            </div>
                            <div className="flex items-center gap-1 shrink-0">
                              {d && <span className="text-[9px] font-mono text-muted-foreground">{d.lawEnforcement.contactInfo}</span>}
                              <ChevronRight size={9} className="text-muted-foreground ml-0.5"/>
                            </div>
                          </button>
                        );
                      })}
                    </div>
                    <div className="rounded-lg border border-red-500/20 bg-red-500/10 p-2.5">
                      <p className="text-[10px] text-red-400 font-semibold leading-relaxed">Alert LP at all {nearby.length} nearby store{nearby.length!==1?"s":""}. Share {boloActive.caseId} description and last known vehicle.</p>
                    </div>
                  </>
                ) : (
                  <p className="text-[10px] text-muted-foreground">No stores within {PROX_KM}km radius of last known location.</p>
                )}
              </div>
            )}

            {/* ORC corridor summary when BOLO active */}
            {boloActive && projRoutes.length>0 && (
              <div className="rounded-2xl border border-yellow-500/20 bg-card p-4 shrink-0">
                <div className="flex items-center gap-2 mb-3">
                  <TrendingUp size={12} className="text-yellow-400"/>
                  <span className="text-xs font-bold text-foreground uppercase tracking-wider">Projected Routes</span>
                  <Chip className="bg-yellow-500/15 text-yellow-400 ml-auto">{projRoutes.length}</Chip>
                </div>
                <div className="space-y-2">
                  {projRoutes.map(r=>{
                    const pc = r.prob>=80?"#EF4444":r.prob>=65?"#F97316":r.prob>=50?"#EAB308":"#3B82F6";
                    const pl = r.prob>=80?"Very High":r.prob>=65?"High":r.prob>=50?"Moderate":"Lower";
                    return (
                      <div key={r.id} className="p-2 rounded-lg bg-secondary/30 border border-border">
                        <div className="flex items-center justify-between mb-1.5">
                          <div className="flex items-center gap-1.5">
                            <div className="w-2 h-2 rounded-full shrink-0" style={{background:r.color}}/>
                            <p className="text-[10px] font-bold text-foreground">{r.name}</p>
                          </div>
                          <div className="flex items-center gap-1">
                            <span className="text-[8px] font-bold uppercase" style={{color:pc}}>{pl}</span>
                            <span className="text-[10px] font-mono font-bold" style={{color:pc}}>{r.prob}%</span>
                          </div>
                        </div>
                        <div className="w-full h-1 rounded-full bg-secondary">
                          <div className="h-1 rounded-full" style={{width:`${r.prob}%`,background:pc}}/>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Store summary */}
            <div className="rounded-2xl border border-border bg-card p-4 shrink-0">
              <span className="text-xs font-bold text-foreground uppercase tracking-wider block mb-3">Network Summary</span>
              <div className="space-y-2.5">
                {[
                  {label:"Priority",    c:"#EF4444", n:PRIORITY_STORE_DATA.length,    note:`${PRIORITY_STORE_DATA.filter(s=>s.status==="incident").length} incidents`},
                  {label:"Opportunity", c:"#EAB308", n:OPPORTUNITY_STORE_DATA.length,  note:null},
                  {label:"Watch List",  c:"#3B82F6", n:WATCH_LIST_DATA.length,         note:`${WATCH_LIST_DATA.filter(s=>!s.socMonitored).length} unmonitored`},
                ].map(item=>(
                  <div key={item.label} className="flex items-center gap-2.5">
                    <svg width="9" height="12" viewBox="0 0 20 27"><path d="M10,0 C4.5,0 0,4.5 0,10 C0,18 10,27 10,27 C10,27 20,18 20,10 C20,4.5 15.5,0 10,0 Z" fill={item.c}/><circle cx="10" cy="10" r="3.5" fill="rgba(255,255,255,0.9)"/></svg>
                    <span className="text-xs text-foreground flex-1">{item.label}</span>
                    <span className="text-xs font-bold font-mono text-foreground">{item.n}</span>
                    {item.note && <span className="text-[9px] text-muted-foreground">{item.note}</span>}
                  </div>
                ))}
                <div className="border-t border-border pt-2 flex items-center justify-between">
                  <span className="text-xs text-muted-foreground">Total Stores</span>
                  <span className="text-xs font-bold font-mono text-foreground">{allIds.length}</span>
                </div>
              </div>
            </div>

            {/* Active incidents */}
            <div className="rounded-2xl border border-border bg-card p-4 shrink-0">
              <div className="flex items-center gap-2 mb-3">
                <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse"/>
                <span className="text-xs font-bold text-foreground uppercase tracking-wider">Active Incidents</span>
                <Chip className="bg-red-500/15 text-red-400 ml-auto">{PRIORITY_STORE_DATA.filter(s=>s.status==="incident").length}</Chip>
              </div>
              <div className="space-y-1.5">
                {PRIORITY_STORE_DATA.filter(s=>s.status==="incident").map(s=>(
                  <button key={s.id} onClick={()=>setSelectedStore(s.id)} className="w-full flex items-center gap-2 p-2 rounded-lg bg-red-500/10 hover:bg-red-500/15 border border-red-500/15 transition-colors text-left">
                    <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse shrink-0"/>
                    <span className="text-[11px] font-mono font-bold text-foreground">#{s.id}</span>
                    <span className="text-[11px] text-muted-foreground flex-1">{s.city}</span>
                    <span className="text-[10px] text-red-400 font-bold">{s.alarms} alm</span>
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

// ─── Main App ─────────────────────────────────────────────────────────────────

export default function App() {
  const [activeNav,setActiveNav] = useState("dashboard");
  const [sidebarOpen,setSidebarOpen] = useState(true);
  const [notifOpen,setNotifOpen] = useState(false);
  const [incidents,setIncidents] = useState(INCIDENTS);

  function handleAssign(id:string) {
    setIncidents(prev=>prev.map(i=>i.id===id?{...i,assigned:"Ty Kelly"}:i));
  }

  const critical = incidents.filter(i=>i.severity==="critical").length;

  function renderContent() {
    switch (activeNav) {
      case "dashboard":  return <DashboardView incidents={incidents} onAssign={handleAssign}/>;
      case "incidents":  return <IncidentsView incidents={incidents} onAssign={handleAssign}/>;
      case "stores":     return <StoresView/>;
      case "watchlist":  return <WatchListView/>;
      case "storemap":   return <StoreMapView/>;
      case "bolo":       return <BOLOView/>;
      case "dataminr":   return <DataminrView/>;
      case "pa":         return <PADownView/>;
      case "reports":    return <ReportsView/>;
      case "operators":  return <OperatorsView/>;
      case "settings":   return <SettingsView/>;
      default:           return <DashboardView incidents={incidents} onAssign={handleAssign}/>;
    }
  }

  return (
    <div className="flex h-screen w-full overflow-hidden bg-background" style={{fontFamily:"'Inter', sans-serif"}}>
      <aside className="flex flex-col shrink-0 transition-all duration-300 overflow-hidden border-r border-border" style={{width:sidebarOpen?220:60,background:"#0B1120"}}>
        <div className="flex items-center gap-3 px-4 py-5 border-b border-border min-h-[64px]">
          <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center shrink-0"><Shield size={16} className="text-white"/></div>
          {sidebarOpen&&<div className="min-w-0"><p className="text-xs font-bold text-foreground leading-tight truncate">Bealls SOC</p><p className="text-[10px] text-muted-foreground leading-tight truncate">Operations Center</p></div>}
        </div>
        <nav className="flex-1 py-4 overflow-y-auto">
          {NAV_ITEMS.map(item=>{const Icon=item.icon;const active=activeNav===item.id;return(
            <button key={item.id} onClick={()=>setActiveNav(item.id)} className={`w-full flex items-center gap-3 px-4 py-2.5 text-left transition-colors relative ${active?"bg-blue-600/20 text-blue-400":"text-muted-foreground hover:text-foreground hover:bg-white/5"}`}>
              {active&&<span className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-5 bg-blue-500 rounded-r-full"/>}
              <Icon size={16} className="shrink-0"/>
              {sidebarOpen&&<><span className="text-sm font-medium flex-1 truncate">{item.label}</span>{item.badge&&<span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-red-500 text-white leading-none">{item.badge}</span>}</>}
              {!sidebarOpen&&item.badge&&<span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-red-500"/>}
            </button>
          );})}
        </nav>
        <button onClick={()=>setSidebarOpen(v=>!v)} className="flex items-center justify-center py-4 border-t border-border text-muted-foreground hover:text-foreground transition-colors">
          <ChevronRight size={14} className={`transition-transform duration-300 ${sidebarOpen?"rotate-180":""}`}/>
        </button>
      </aside>

      <div className="flex flex-col flex-1 min-w-0 overflow-hidden">
        <header className="flex items-center gap-4 px-6 border-b border-border bg-card/50 backdrop-blur-sm h-16 shrink-0">
          <div className="flex-1 max-w-sm relative"><Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"/><input placeholder="Search stores, incidents…" className="w-full pl-9 pr-4 py-2 rounded-xl text-sm bg-secondary border border-border text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all"/></div>
          <div className="flex items-center gap-2 ml-auto">
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-emerald-500/10 border border-emerald-500/20"><span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"/><span className="text-xs font-semibold text-emerald-400">LIVE</span></div>
            <button className="w-9 h-9 rounded-xl flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors"><RefreshCw size={15}/></button>
            <div className="relative">
              <button onClick={()=>setNotifOpen(v=>!v)} className="w-9 h-9 rounded-xl flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors relative"><Bell size={15}/>{critical>0&&<span className="absolute top-1 right-1 w-2 h-2 rounded-full bg-red-500 border border-background"/>}</button>
              {notifOpen&&(
                <div className="absolute right-0 top-12 w-80 rounded-2xl border border-border bg-card shadow-2xl z-50 overflow-hidden">
                  <div className="flex items-center justify-between px-4 py-3 border-b border-border"><p className="text-sm font-semibold text-foreground">Notifications</p><button onClick={()=>setNotifOpen(false)} className="text-muted-foreground hover:text-foreground"><X size={14}/></button></div>
                  {incidents.slice(0,4).map(inc=>{const sc=sevCfg(inc.severity);return(<div key={inc.id} className="flex items-start gap-3 px-4 py-3 hover:bg-secondary/50 border-b border-border last:border-0 transition-colors cursor-pointer"><span className={`w-2 h-2 rounded-full ${sc.dot} mt-1.5 shrink-0`}/><div><p className="text-xs font-semibold text-foreground">{inc.caseType}</p><p className="text-xs text-muted-foreground">Store #{inc.store} · {inc.time}</p></div></div>);})}
                </div>
              )}
            </div>
            <button className="flex items-center gap-2.5 pl-1 pr-3 py-1 rounded-xl hover:bg-secondary transition-colors">
              <div className="w-7 h-7 rounded-full bg-gradient-to-br from-blue-500 to-blue-700 flex items-center justify-center text-xs font-bold text-white">TK</div>
              <div className="hidden sm:block text-left"><p className="text-xs font-semibold text-foreground leading-tight">Ty Kelly</p><p className="text-[10px] text-muted-foreground leading-tight">SOC Manager</p></div>
              <ChevronDown size={12} className="text-muted-foreground"/>
            </button>
          </div>
        </header>
        <main className="flex-1 overflow-y-auto p-6">{renderContent()}</main>
      </div>
    </div>
  );
}

import {Injectable} from '@angular/core';
import {delay, Observable, of} from 'rxjs';
import {PaginatedResponse, User} from '../list/models/list.model';

@Injectable({
  providedIn: "root",
})
export class DataService {
  private users: User[] = [];
  private products: any[] = [];

  constructor() {
    this.generateUsers(100);
    this.generateProducts(100);
  }

  private generateUsers(count: number): void {
    const groups = [
      "Management",
      "Development",
      "Design",
      "Marketing",
      "Finance",
      "HR",
      "Sales",
      "Support",
      "Operations",
      "Legal",
    ];

    const rolesByGroup: { [key: string]: string[] } = {
      Management: [
        "CEO",
        "CTO",
        "CFO",
        "COO",
        "Director",
        "Manager",
        "Team Lead",
        "Product Owner",
        "Project Manager",
      ],
      Development: [
        "Software Engineer",
        "Frontend Developer",
        "Backend Developer",
        "Full Stack Developer",
        "DevOps Engineer",
        "QA Engineer",
        "Systems Architect",
        "Mobile Developer",
      ],
      Design: [
        "UI Designer",
        "UX Designer",
        "Graphic Designer",
        "Product Designer",
        "Creative Director",
        "Art Director",
        "Illustrator",
      ],
      Marketing: [
        "Marketing Manager",
        "Content Writer",
        "SEO Specialist",
        "Social Media Manager",
        "Growth Hacker",
        "Brand Manager",
        "Digital Marketer",
      ],
      Finance: [
        "Accountant",
        "Financial Analyst",
        "Controller",
        "Treasurer",
        "Auditor",
        "Tax Specialist",
        "Payroll Specialist",
      ],
      HR: [
        "HR Manager",
        "Recruiter",
        "Talent Acquisition",
        "Training Specialist",
        "HR Coordinator",
        "Benefits Administrator",
      ],
      Sales: [
        "Sales Representative",
        "Account Executive",
        "Business Development",
        "Sales Manager",
        "Inside Sales",
        "Territory Manager",
      ],
      Support: [
        "Customer Support",
        "Technical Support",
        "Help Desk",
        "Customer Success Manager",
        "Account Manager",
      ],
      Operations: [
        "Operations Manager",
        "Business Analyst",
        "Process Improvement",
        "Logistics Coordinator",
        "Supply Chain Manager",
      ],
      Legal: [
        "Legal Counsel",
        "Compliance Officer",
        "Patent Attorney",
        "Legal Assistant",
        "Contract Manager",
      ],
    };

    const badges = [
      "New",
      "VIP",
      "Admin",
      "Manager",
      "Lead",
      "1",
      "2",
      "3",
      "5",
      "10",
    ];

    const firstNames = [
      "John",
      "Jane",
      "Michael",
      "Emily",
      "David",
      "Sarah",
      "Robert",
      "Jessica",
      "William",
      "Emma",
      "James",
      "Olivia",
      "Richard",
      "Sophia",
      "Thomas",
      "Ava",
      "Charles",
      "Isabella",
      "Daniel",
      "Mia",
      "Matthew",
      "Charlotte",
      "Anthony",
      "Amelia",
      "Mark",
      "Harper",
      "Paul",
      "Evelyn",
      "Steven",
      "Abigail",
    ];

    const lastNames = [
      "Smith",
      "Johnson",
      "Williams",
      "Jones",
      "Brown",
      "Davis",
      "Miller",
      "Wilson",
      "Moore",
      "Taylor",
      "Anderson",
      "Thomas",
      "Jackson",
      "White",
      "Harris",
      "Martin",
      "Thompson",
      "Garcia",
      "Martinez",
      "Robinson",
      "Clark",
      "Rodriguez",
      "Lewis",
      "Lee",
      "Walker",
      "Hall",
      "Allen",
      "Young",
      "King",
      "Wright",
    ];

    const icons = ["👨", "👩", "👱‍♂️", "👱‍♀️", "👨‍💼", "👩‍💼", "👨‍💻", "👩‍💻", "👨‍🎨", "👩‍🎨"];

    for (let i = 1; i <= count; i++) {
      const group = groups[Math.floor(Math.random() * groups.length)];

      const firstName =
        firstNames[Math.floor(Math.random() * firstNames.length)];
      const lastName = lastNames[Math.floor(Math.random() * lastNames.length)];
      const name = `${firstName} ${lastName}`;

      const roles = rolesByGroup[group];
      const subText = roles[Math.floor(Math.random() * roles.length)];

      const email = `${firstName.toLowerCase()}.${lastName.toLowerCase()}@example.com`;

      const hasBadge = Math.random() < 0.3;
      const badge = hasBadge
        ? badges[Math.floor(Math.random() * badges.length)]
        : undefined;

      const showChevron = Math.random() < 0.5;

      const icon = icons[Math.floor(Math.random() * icons.length)];

      const user: User = {
        id: i,
        name: name,
        email: email,
        avatar: `assets/avatars/avatar${(i % 10) + 1}.jpg`,
        badge: badge,
        showChevron: showChevron,
        subText: subText,
        icon: icon,
        group: group,
      };

      this.users.push(user);
    }

    this.users.sort((a, b) => {
      if (a.group === b.group) {
        return a.name.localeCompare(b.name);
      }
      return a.group!.localeCompare(b.group!);
    });
  }

  private generateProducts(count: number): void {
    const groups = [
      "Electronics",
      "Computers",
      "Smartphones",
      "Audio",
      "Accessories",
      "Office",
      "Furniture",
      "Storage",
      "Networking",
      "Software",
    ];

    const productsByGroup: {
      [key: string]: { prefix: string; items: string[]; icons: string[] };
    } = {
      Electronics: {
        prefix: "",
        items: [
          "TV",
          "Smart TV",
          "OLED TV",
          "LED TV",
          "Monitor",
          "Gaming Monitor",
          "Projector",
          "Camera",
          "DSLR Camera",
          "Action Camera",
        ],
        icons: ["📺", "📱", "🖥️", "📷", "🎮", "📹"],
      },
      Computers: {
        prefix: "",
        items: [
          "Laptop",
          "Desktop PC",
          "Gaming PC",
          "MacBook Pro",
          "MacBook Air",
          "Chromebook",
          "Workstation",
          "All-in-One PC",
          "Mini PC",
          "Tablet",
        ],
        icons: ["💻", "🖥️", "📱", "⌨️", "🖱️"],
      },
      Smartphones: {
        prefix: "",
        items: [
          "iPhone",
          "Samsung Galaxy",
          "Pixel",
          "OnePlus",
          "Xiaomi",
          "Huawei",
          "Oppo",
          "Vivo",
          "Motorola",
          "LG",
        ],
        icons: ["📱", "📲", "☎️"],
      },
      Audio: {
        prefix: "",
        items: [
          "Headphones",
          "Earbuds",
          "Bluetooth Speaker",
          "Soundbar",
          "Home Theater",
          "Microphone",
          "Wireless Earbuds",
          "Noise-Cancelling Headphones",
          "Gaming Headset",
          "Record Player",
        ],
        icons: ["🎧", "🔊", "🎙️", "🎵", "🎤"],
      },
      Accessories: {
        prefix: "",
        items: [
          "Mouse",
          "Keyboard",
          "USB Hub",
          "External Drive",
          "Charger",
          "Cable",
          "Adapter",
          "Case",
          "Screen Protector",
          "Mount",
        ],
        icons: ["🖱️", "⌨️", "🔌", "🔋", "📱", "💾"],
      },
      Office: {
        prefix: "",
        items: [
          "Desk",
          "Chair",
          "Lamp",
          "Filing Cabinet",
          "Whiteboard",
          "Printer",
          "Scanner",
          "Shredder",
          "Calculator",
          "Paper",
        ],
        icons: ["🪑", "💡", "🖨️", "📄", "📊", "📋"],
      },
      Furniture: {
        prefix: "",
        items: [
          "Office Chair",
          "Standing Desk",
          "Ergonomic Chair",
          "Bookshelf",
          "Storage Cabinet",
          "Conference Table",
          "Desk Mat",
          "Footrest",
          "Monitor Stand",
          "Drawer Unit",
        ],
        icons: ["🪑", "🗄️", "📚", "🛋️"],
      },
      Storage: {
        prefix: "",
        items: [
          "SSD",
          "HDD",
          "External SSD",
          "USB Flash Drive",
          "Memory Card",
          "NAS",
          "Cloud Storage",
          "RAID Array",
          "Backup Drive",
          "Portable Drive",
        ],
        icons: ["💾", "💿", "📀", "📦", "🗃️"],
      },
      Networking: {
        prefix: "",
        items: [
          "Router",
          "Mesh WiFi",
          "Network Switch",
          "Ethernet Cable",
          "WiFi Extender",
          "Access Point",
          "Modem",
          "Network Card",
          "Firewall",
          "VPN Router",
        ],
        icons: ["🔌", "📡", "📶", "🌐", "📱"],
      },
      Software: {
        prefix: "",
        items: [
          "Windows",
          "macOS",
          "Office Suite",
          "Antivirus",
          "Design Suite",
          "Video Editor",
          "Photo Editor",
          "Development IDE",
          "Cloud Backup",
          "VPN Service",
        ],
        icons: ["💻", "🔐", "📊", "🎨", "📐", "📝"],
      },
    };

    const badges = [
      "New",
      "Sale",
      "Hot",
      "Best Seller",
      "Premium",
      "Limited",
      "Exclusive",
      "10% Off",
      "20% Off",
      "Free Shipping",
    ];

    const variants = [
      "Pro",
      "Plus",
      "Premium",
      "Ultra",
      "Max",
      "Mini",
      "Lite",
      "Advanced",
      "Standard",
      "Basic",
    ];
    const sizes = [
      '13"',
      '15"',
      '17"',
      '24"',
      '27"',
      '32"',
      '43"',
      "1TB",
      "2TB",
      "512GB",
      "256GB",
      "128GB",
    ];
    const colors = [
      "Black",
      "White",
      "Silver",
      "Gold",
      "Blue",
      "Red",
      "Green",
      "Pink",
      "Purple",
      "Gray",
    ];

    for (let i = 1; i <= count; i++) {
      const group = groups[Math.floor(Math.random() * groups.length)];

      const productBase = productsByGroup[group];
      const productName =
        productBase.items[Math.floor(Math.random() * productBase.items.length)];

      const hasVariant = Math.random() < 0.5;
      const variant = hasVariant
        ? variants[Math.floor(Math.random() * variants.length)]
        : "";

      const hasSize = Math.random() < 0.3;
      const size = hasSize
        ? sizes[Math.floor(Math.random() * sizes.length)]
        : "";

      const hasColor = Math.random() < 0.2;
      const color = hasColor
        ? colors[Math.floor(Math.random() * colors.length)]
        : "";

      let text = productName;
      if (variant) text += ` ${variant}`;
      if (size) text += ` ${size}`;
      if (color) text += ` (${color})`;

      const price = Math.floor(Math.random() * 198000 + 1999) / 100;
      const subText = `$${price.toFixed(2)}`;

      const hasBadge = Math.random() < 0.3;
      const badge = hasBadge
        ? badges[Math.floor(Math.random() * badges.length)]
        : undefined;

      const showChevron = Math.random() < 0.5;

      const icon =
        productBase.icons[Math.floor(Math.random() * productBase.icons.length)];

      const product = {
        id: i,
        text,
        subText,
        badge,
        showChevron,
        icon,
        group,
      };

      this.products.push(product);
    }

    this.products.sort((a, b) => {
      if (a.group === b.group) {
        return a.text.localeCompare(b.text);
      }
      return a.group.localeCompare(b.group);
    });
  }

  getUsers(
    page: number = 1,
    pageSize: number = 15,
    search: string = ""
  ): Observable<PaginatedResponse<User>> {
    let filteredUsers = this.users;

    if (search && search.trim() !== "") {
      const searchLower = search.toLowerCase();
      filteredUsers = filteredUsers.filter(
        (user) =>
          user.name.toLowerCase().includes(searchLower) ||
          user.email.toLowerCase().includes(searchLower) ||
          user.subText?.toLowerCase().includes(searchLower) ||
          user.group?.toLowerCase().includes(searchLower)
      );
    }

    const startIndex = (page - 1) * pageSize;
    const endIndex = Math.min(startIndex + pageSize, filteredUsers.length);
    const paginatedUsers = filteredUsers.slice(startIndex, endIndex);

    const simulatedDelay = Math.random() * 600 + 200;

    const response: PaginatedResponse<User> = {
      data: paginatedUsers,
      totalCount: filteredUsers.length,
      hasMore: endIndex < filteredUsers.length,
      page: page,
      pageSize: pageSize,
    };

    return of(response).pipe(delay(simulatedDelay));
  }

  getProducts(
    page: number = 1,
    pageSize: number = 15,
    search: string = ""
  ): Observable<PaginatedResponse<any>> {
    let filteredProducts = this.products;

    if (search && search.trim() !== "") {
      const searchLower = search.toLowerCase();
      filteredProducts = filteredProducts.filter(
        (product) =>
          product.text.toLowerCase().includes(searchLower) ||
          product.subText?.toLowerCase().includes(searchLower) ||
          product.group?.toLowerCase().includes(searchLower)
      );
    }

    const startIndex = (page - 1) * pageSize;
    const endIndex = Math.min(startIndex + pageSize, filteredProducts.length);
    const paginatedProducts = filteredProducts.slice(startIndex, endIndex);

    const simulatedDelay = Math.random() * 600 + 200;

    const response: PaginatedResponse<any> = {
      data: paginatedProducts,
      totalCount: filteredProducts.length,
      hasMore: endIndex < filteredProducts.length,
      page: page,
      pageSize: pageSize,
    };

    return of(response).pipe(delay(simulatedDelay));
  }

  getAllUsers(): Observable<User[]> {
    return of(this.users).pipe(delay(300));
  }

  getAllProducts(): Observable<any[]> {
    return of(this.products).pipe(delay(300));
  }
}
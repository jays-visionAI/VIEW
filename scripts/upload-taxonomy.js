/**
 * Taxonomy Firestore Upload Script
 * 분류 체계 데이터를 Firestore에 업로드합니다.
 * 
 * 사용법: node scripts/upload-taxonomy.js
 */

const admin = require('firebase-admin');
const path = require('path');

// Firebase Admin 초기화 (서비스 계정 필요)
const serviceAccountPath = path.join(__dirname, '../service-account.json');

try {
    admin.initializeApp({
        credential: admin.credential.cert(require(serviceAccountPath))
    });
} catch (error) {
    console.log('Firebase already initialized or using default credentials');
}

const db = admin.firestore();

// VIEW Advertising Taxonomy v1.0
const taxonomyData = {
    version: "1.0",
    lastUpdated: "2025-11-06",
    maintainer: "VIEW Protocol – CODEX Advertising Intelligence",

    industries: {
        Fashion: {
            displayName: "패션",
            displayNameKo: "패션",
            icon: "👗",
            products: {
                Apparel: {
                    displayName: "의류",
                    subcategories: ["Menswear", "Womenswear", "Sportswear", "Outdoorwear", "Uniforms", "Kidswear"]
                },
                Footwear: {
                    displayName: "신발",
                    subcategories: ["Sneakers", "Sandals", "Boots", "High Heels", "Slippers"]
                },
                Accessories: {
                    displayName: "액세서리",
                    subcategories: ["Bags", "Watches", "Jewelry", "Belts", "Glasses", "Hats"]
                }
            }
        },

        Beauty: {
            displayName: "뷰티",
            displayNameKo: "뷰티",
            icon: "💄",
            products: {
                Skincare: {
                    displayName: "스킨케어",
                    subcategories: ["Anti-aging", "Whitening", "Moisturizing", "Sunscreen", "Acne-care", "Serum", "Toner"]
                },
                Makeup: {
                    displayName: "메이크업",
                    subcategories: ["Lipstick", "Foundation", "Mascara", "Eyeliner", "Blusher"]
                },
                Haircare: {
                    displayName: "헤어케어",
                    subcategories: ["Shampoo", "Conditioner", "Treatment", "Styling"]
                },
                Fragrance: {
                    displayName: "향수",
                    subcategories: ["Perfume", "Body Mist"]
                }
            }
        },

        Food_Beverage: {
            displayName: "식음료",
            displayNameKo: "식음료",
            icon: "🍔",
            products: {
                Restaurant: {
                    displayName: "레스토랑",
                    subcategories: ["Fine Dining", "Casual Dining", "Fast Food", "Franchise Chain"]
                },
                Beverage: {
                    displayName: "음료",
                    subcategories: ["Coffee", "Tea", "Juice", "Alcohol", "Energy Drink"]
                },
                Grocery: {
                    displayName: "식료품",
                    subcategories: ["Organic Food", "Snack", "Frozen Food", "Dairy Product", "Fresh Produce"]
                },
                Delivery_Service: {
                    displayName: "배달서비스",
                    subcategories: ["Meal Kit", "Food Delivery Platform"]
                }
            }
        },

        Travel: {
            displayName: "여행",
            displayNameKo: "여행",
            icon: "✈️",
            products: {
                Airline: {
                    displayName: "항공사",
                    subcategories: ["Budget", "Full Service", "Charter", "Regional"]
                },
                Hotel: {
                    displayName: "호텔",
                    subcategories: ["Luxury", "Resort", "Boutique", "Business", "Capsule"]
                },
                Tour: {
                    displayName: "투어",
                    subcategories: ["Honeymoon", "Cultural", "Adventure", "Wellness", "Eco-Tourism"]
                },
                Transportation: {
                    displayName: "교통",
                    subcategories: ["Train", "Bus", "Car Rental", "Cruise"]
                }
            }
        },

        Finance: {
            displayName: "금융",
            displayNameKo: "금융",
            icon: "💰",
            products: {
                Banking: {
                    displayName: "은행",
                    subcategories: ["Savings Account", "Loan", "Credit Card", "Payment App"]
                },
                Investment: {
                    displayName: "투자",
                    subcategories: ["Stocks", "ETF", "Crypto", "Real Estate Fund", "Bonds"]
                },
                Insurance: {
                    displayName: "보험",
                    subcategories: ["Life", "Health", "Car", "Travel", "Property"]
                },
                Fintech: {
                    displayName: "핀테크",
                    subcategories: ["Digital Wallet", "Robo Advisor", "DeFi", "P2P Lending"]
                }
            }
        },

        Technology: {
            displayName: "기술",
            displayNameKo: "기술",
            icon: "📱",
            products: {
                Consumer_Electronics: {
                    displayName: "가전",
                    subcategories: ["Smartphone", "Laptop", "Tablet", "Smartwatch", "Headphones"]
                },
                Software: {
                    displayName: "소프트웨어",
                    subcategories: ["Productivity", "Security", "Cloud Service", "AI Application"]
                },
                Hardware: {
                    displayName: "하드웨어",
                    subcategories: ["Semiconductor", "IoT Device", "3D Printer"]
                },
                Gaming: {
                    displayName: "게임",
                    subcategories: ["Console", "PC Game", "Mobile Game", "VR/AR"]
                }
            }
        },

        Education: {
            displayName: "교육",
            displayNameKo: "교육",
            icon: "📚",
            products: {
                Online_Course: {
                    displayName: "온라인강의",
                    subcategories: ["Language", "Programming", "Business", "Design", "Music"]
                },
                Institution: {
                    displayName: "교육기관",
                    subcategories: ["University", "College", "Vocational School", "Tutoring Center"]
                },
                Certification: {
                    displayName: "자격증",
                    subcategories: ["MBA", "TOEFL", "IELTS", "Blockchain Certification", "AI Engineer"]
                }
            }
        },

        Health_Wellness: {
            displayName: "건강/웰니스",
            displayNameKo: "건강/웰니스",
            icon: "💪",
            products: {
                Fitness: {
                    displayName: "피트니스",
                    subcategories: ["Gym", "Yoga", "Pilates", "Home Training"]
                },
                Nutrition: {
                    displayName: "영양",
                    subcategories: ["Supplements", "Vitamins", "Protein", "Health Drinks"]
                },
                Medical_Service: {
                    displayName: "의료서비스",
                    subcategories: ["Clinic", "Dental", "Dermatology", "Aesthetic", "Telemedicine"]
                },
                Mental_Health: {
                    displayName: "정신건강",
                    subcategories: ["Meditation", "Counseling", "Sleep Aid Apps"]
                }
            }
        },

        Auto_Mobility: {
            displayName: "자동차/모빌리티",
            displayNameKo: "자동차/모빌리티",
            icon: "🚗",
            products: {
                Vehicle: {
                    displayName: "차량",
                    subcategories: ["Electric Vehicle", "SUV", "Sedan", "Motorcycle", "Used Car"]
                },
                Service: {
                    displayName: "서비스",
                    subcategories: ["Ride Sharing", "Car Sharing", "Maintenance", "Charging Station"]
                },
                Accessories: {
                    displayName: "액세서리",
                    subcategories: ["Tire", "Battery", "Navigation", "Dashcam"]
                }
            }
        },

        Home_Living: {
            displayName: "홈/리빙",
            displayNameKo: "홈/리빙",
            icon: "🏠",
            products: {
                Furniture: {
                    displayName: "가구",
                    subcategories: ["Sofa", "Bed", "Table", "Lighting"]
                },
                Interior: {
                    displayName: "인테리어",
                    subcategories: ["Wallpaper", "Flooring", "Smart Home", "Home Decor"]
                },
                Appliances: {
                    displayName: "가전제품",
                    subcategories: ["Refrigerator", "Washing Machine", "Air Conditioner", "Vacuum"]
                },
                Real_Estate: {
                    displayName: "부동산",
                    subcategories: ["Apartment", "Villa", "Commercial", "Rental Service"]
                }
            }
        },

        Entertainment: {
            displayName: "엔터테인먼트",
            displayNameKo: "엔터테인먼트",
            icon: "🎬",
            products: {
                Streaming: {
                    displayName: "스트리밍",
                    subcategories: ["OTT", "Music", "Podcast", "Webtoon"]
                },
                Event: {
                    displayName: "이벤트",
                    subcategories: ["Concert", "Exhibition", "Festival"]
                },
                Media: {
                    displayName: "미디어",
                    subcategories: ["TV Channel", "Influencer", "Magazine"]
                },
                Sports: {
                    displayName: "스포츠",
                    subcategories: ["Football", "Golf", "eSports", "Fitness Challenge"]
                }
            }
        },

        ESG_Sustainability: {
            displayName: "ESG/지속가능성",
            displayNameKo: "ESG/지속가능성",
            icon: "🌱",
            products: {
                Environment: {
                    displayName: "환경",
                    subcategories: ["Carbon Offset", "Recycling", "Clean Energy"]
                },
                Governance: {
                    displayName: "거버넌스",
                    subcategories: ["CSR Program", "ESG Fund"]
                },
                Social: {
                    displayName: "사회",
                    subcategories: ["Donation Platform", "Ethical Brand", "Volunteer Organization"]
                }
            }
        }
    }
};

async function uploadTaxonomy() {
    console.log('📤 분류 체계(Taxonomy) 업로드 시작...');

    try {
        // /taxonomy/v1 문서에 저장
        await db.doc('taxonomy/v1').set(taxonomyData);

        console.log('✅ 분류 체계 업로드 완료!');
        console.log(`   - 산업 수: ${Object.keys(taxonomyData.industries).length}`);

        // 카테고리 수 계산
        let totalProducts = 0;
        let totalSubcategories = 0;
        for (const industry of Object.values(taxonomyData.industries)) {
            totalProducts += Object.keys(industry.products).length;
            for (const product of Object.values(industry.products)) {
                totalSubcategories += product.subcategories.length;
            }
        }
        console.log(`   - 제품군 수: ${totalProducts}`);
        console.log(`   - 세부 카테고리 수: ${totalSubcategories}`);

    } catch (error) {
        console.error('❌ 업로드 실패:', error);
        throw error;
    }
}

// 실행
uploadTaxonomy()
    .then(() => process.exit(0))
    .catch(() => process.exit(1));

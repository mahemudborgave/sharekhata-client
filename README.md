# Sharekhata 📒

Sharekhata is a simple expense-sharing app that helps you and your friend manage transactions in real-time.  
It’s designed for easy tracking of who owes what, with synced entries and exportable reports.

---

## 🚀 Features
- **Registration & Login** with mobile number  
- **Add Friend** using their mobile number  
- **Real-Time Sync** of all entries/transactions  
- **Color-Coded Transactions**  
  - Blue: Your entries  
  - Yellow: Friend’s entries  
- **PDF Export** for transaction history and balance summary  

---

## 📱 How It Works
1. Register with your mobile number.  
2. Add your friend using their registered mobile number.  
3. Both can add transactions, which instantly sync.  
4. Easily distinguish who added which entry with colors.  
5. Export your history anytime as a PDF.  

---

## 🛠️ Tech Stack
- Backend: Node+express
- Database: MongoDB  
- Frontend: React and Tailwind 
- PDF Generation: jsPDF

---

## 📦 Installation
```bash
# Clone the repository
git clone https://github.com/mahemudborgave/sharekhata-client.git

# Navigate to project folder
cd sharekhata

# Install dependencies
bun install

# Run the app
bun dev

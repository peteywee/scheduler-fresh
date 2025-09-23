export type Staff = {
    id: string;
    name: string;
    avatarUrl: string;
  };
  
  export type Shift = {
    id: string;
    staffId: string;
    dayIndex: number; // 0 for Monday, 6 for Sunday
    startTime: string;
    endTime: string;
    role: string;
    status: "confirmed" | "pending" | "conflict";
  };
  
  export type Schedule = {
    staff: Staff[];
    shifts: Shift[];
  };
  
  export const mockSchedule: Schedule = {
    staff: [
      { id: "1", name: "Alice Johnson", avatarUrl: "https://i.pravatar.cc/150?u=a042581f4e29026024d" },
      { id: "2", name: "Bob Williams", avatarUrl: "https://i.pravatar.cc/150?u=a042581f4e29026704d" },
      { id: "3", name: "Charlie Brown", avatarUrl: "https://i.pravatar.cc/150?u=a04258114e29026702d" },
      { id: "4", name: "Diana Miller", avatarUrl: "https://i.pravatar.cc/150?u=a048581f4e29026701d" },
    ],
    shifts: [
      // Alice's shifts
      { id: "s1", staffId: "1", dayIndex: 0, startTime: "09:00", endTime: "17:00", role: "Cashier", status: "confirmed" },
      { id: "s2", staffId: "1", dayIndex: 2, startTime: "09:00", endTime: "17:00", role: "Cashier", status: "confirmed" },
      { id: "s3", staffId: "1", dayIndex: 4, startTime: "12:00", endTime: "20:00", role: "Stocker", status: "pending" },
      
      // Bob's shifts
      { id: "s4", staffId: "2", dayIndex: 1, startTime: "10:00", endTime: "18:00", role: "Manager", status: "confirmed" },
      { id: "s5", staffId: "2", dayIndex: 3, startTime: "10:00", endTime: "18:00", role: "Manager", status: "confirmed" },
      
      // Charlie's shifts
      { id: "s6", staffId: "3", dayIndex: 0, startTime: "14:00", endTime: "22:00", role: "Stocker", status: "confirmed" },
      { id: "s7", staffId: "3", dayIndex: 1, startTime: "14:00", endTime: "22:00", role: "Stocker", status: "confirmed" },
      { id: "s8", staffId: "3", dayIndex: 5, startTime: "10:00", endTime: "16:00", role: "Cashier", status: "conflict" },
  
      // Diana's shifts
      { id: "s9", staffId: "4", dayIndex: 2, startTime: "08:00", endTime: "16:00", role: "Customer Service", status: "confirmed" },
      { id: "s10", staffId: "4", dayIndex: 4, startTime: "08:00", endTime: "16:00", role: "Customer Service", status: "confirmed" },
      { id: "s11", staffId: "4", dayIndex: 6, startTime: "10:00", endTime: "18:00", role: "Customer Service", status: "pending" },
    ],
  };
  
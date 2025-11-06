// Fix: Define minimal types for Cloudflare Pages Functions to resolve compilation errors.
// In a real project setup, these would be provided by @cloudflare/workers-types.
interface KVNamespace {
  get(key: string, type: 'json'): Promise<any | null>;
  put(key: string, value: string): Promise<void>;
}

interface EventContext<Env = any> {
  request: Request;
  env: Env;
  // NOTE: Other context properties like params, next, etc., are omitted for simplicity
  // as they are not used in this file.
}

type PagesFunction<Env = any> = (
  context: EventContext<Env>
) => Promise<Response> | Response;


// Cloudflare Pages Functions a C-style API.
// The Env interface provides type hints for any bindings associated with your Functions.
interface Env {
  DB: KVNamespace;
}

// The key used to store the application state in KV.
const DATA_KEY = "app_data_v1";

// Default initial data structure if no data is found in KV.
// This ensures that the application has a valid state on its first run.
const initialData = {
  teamMembers: [
    { id: 'tm1', name: '品孝' },
    { id: 'tm2', name: '13' },
    { id: 'tm3', name: '思嫺' },
    { id: 'tm4', name: '詩涵' },
    { id: 'tm5', name: '香' },
    { id: 'tm6', name: '喜德' },
  ],
  holidays: [
    {
      id: 'h1',
      name: '228連假',
      startDate: '2025-02-28',
      endDate: '2025-03-02',
      slots: 3,
      applications: [
        { id: 'app1', memberId: 'tm1', memberName: '品孝', preference: 1 },
      ],
      isSpecialLottery: false,
    },
    {
      id: 'h2',
      name: '4月假',
      startDate: '2025-04-04',
      endDate: '2025-04-06',
      slots: 2,
      applications: [
        { id: 'app2', memberId: 'tm2', memberName: '13', preference: 2 },
      ],
      isSpecialLottery: false,
    },
    { id: 'h3', name: '5月', startDate: '2025-05-01', endDate: '2025-05-01', slots: 3, applications: [], isSpecialLottery: false },
    { id: 'h4', name: '6月', startDate: '2025-06-08', endDate: '2025-06-10', slots: 3, applications: [], isSpecialLottery: false },
    { id: 'h5', name: '9月', startDate: '2025-09-17', endDate: '2025-09-17', slots: 2, applications: [], isSpecialLottery: false },
    { id: 'h6', name: '10月國慶', startDate: '2025-10-10', endDate: '2025-10-12', slots: 3, applications: [], isSpecialLottery: false },
    { id: 'h7', name: '10月光復', startDate: '2025-10-25', endDate: '2025-10-25', slots: 3, applications: [], isSpecialLottery: false },
    { id: 'h8', name: '12月25', startDate: '2025-12-25', endDate: '2025-12-25', slots: 3, applications: [], isSpecialLottery: false },
  ],
  defaultPreference: 5,
};

// Handles GET requests to /api/data.
// It fetches the current application state from the KV store.
export const onRequestGet: PagesFunction<Env> = async ({ env }) => {
  try {
    const data = await env.DB.get(DATA_KEY, 'json');
    const responseData = data || initialData;
    return new Response(JSON.stringify(responseData), {
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('KV GET Error:', error);
    return new Response('Error fetching data from KV', { status: 500 });
  }
};

// Handles POST requests to /api/data.
// It receives the new application state from the client and saves it to the KV store.
export const onRequestPost: PagesFunction<Env> = async ({ request, env }) => {
  try {
    const newData = await request.json();
    if (!newData) {
      return new Response('No data provided', { status: 400 });
    }
    await env.DB.put(DATA_KEY, JSON.stringify(newData));
    return new Response('Data saved successfully', { status: 200 });
  } catch (error) {
    console.error('KV POST Error:', error);
    return new Response('Error saving data to KV', { status: 500 });
  }
};

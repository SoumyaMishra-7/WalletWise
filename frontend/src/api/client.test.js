import axios from 'axios';
import MockAdapter from 'axios-mock-adapter';
import api, { refreshClient } from './client';

describe('API Client Interceptor', () => {
    let mockApi;
    let mockRefresh;

    beforeEach(() => {
        // Mock the api instance where interceptors are attached
        mockApi = new MockAdapter(api);
        // Mock the refreshClient instance used inside the interceptor
        mockRefresh = new MockAdapter(refreshClient);
    });

    afterEach(() => {
        mockApi.restore();
        mockRefresh.restore();
    });

    test('retries request on 401 and successful refresh', async () => {
        // 1. Initial request fails with 401
        mockApi.onGet('/protected').replyOnce(401);

        // 2. Refresh request succeeds
        mockRefresh.onPost('/api/auth/refresh').reply(200);

        // 3. Retry request succeeds
        mockApi.onGet('/protected').replyOnce(200, { data: 'success' });

        // Execute request
        const response = await api.get('/protected');

        expect(response.status).toBe(200);
        expect(response.data).toEqual({ data: 'success' });

        // Verify refresh was called
        expect(mockRefresh.history.post.length).toBe(1);
        expect(mockRefresh.history.post[0].url).toBe('/api/auth/refresh');
    });

    test('rejects request on 401 and failed refresh', async () => {
        // 1. Initial request fails with 401
        mockApi.onGet('/protected').replyOnce(401);

        // 2. Refresh request fails
        mockRefresh.onPost('/api/auth/refresh').reply(401);

        // Execute request expecting rejection
        await expect(api.get('/protected')).rejects.toThrow();

        // Verify refresh was called
        expect(mockRefresh.history.post.length).toBe(1);
    });
});

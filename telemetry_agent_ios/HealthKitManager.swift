import Foundation
import HealthKit

class HealthKitManager: ObservableObject {
    let healthStore = HKHealthStore()
    
    // The specific data type we want to read (Heart Rate)
    let heartRateType = HKQuantityType.quantityType(forIdentifier: .heartRate)!
    
    @Published var currentHeartRate: Double = 0.0
    
    func requestAuthorization(completion: @escaping (Bool) -> Void) {
        guard HKHealthStore.isHealthDataAvailable() else {
            completion(false)
            return
        }
        
        let typesToRead: Set<HKObjectType> = [heartRateType]
        
        healthStore.requestAuthorization(toShare: nil, read: typesToRead) { (success, error) in
            completion(success)
        }
    }
    
    func enableBackgroundDelivery() {
        // Instruct HealthKit to wake the app in the background when new heart rate samples arrive
        healthStore.enableBackgroundDelivery(for: heartRateType, frequency: .immediate) { (success, error) in
            if success {
                print("Background delivery for heart rate enabled.")
                self.startHeartRateObserverQuery()
            } else {
                if let error = error {
                    print("Failed to enable background delivery: \(error.localizedDescription)")
                }
            }
        }
    }
    
    private func startHeartRateObserverQuery() {
        let query = HKObserverQuery(sampleType: heartRateType, predicate: nil) { [weak self] (query, completionHandler, error) in
            if error != nil {
                print("Observer query failed")
                return
            }
            
            // Fetch the newest samples
            self?.fetchLatestHeartRateSample { sample in
                guard let sample = sample else {
                    completionHandler()
                    return
                }
                
                let hrUnit = HKUnit(from: "count/min")
                let hrValue = sample.quantity.doubleValue(for: hrUnit)
                
                // Get context (active vs sedentary)
                var context = "unknown"
                if let motionContext = sample.metadata?[HKMetadataKeyHeartRateMotionContext] as? Int {
                    if motionContext == HKHeartRateMotionContext.active.rawValue {
                        context = "active"
                    } else if motionContext == HKHeartRateMotionContext.sedentary.rawValue {
                        context = "sedentary"
                    }
                }
                
                DispatchQueue.main.async {
                    self?.currentHeartRate = hrValue
                }
                
                // Send securely to FastAPI backend
                self?.transmitToBackend(bpm: hrValue, context: context, timestamp: sample.startDate)
                
                // Tell HealthKit we successfully processed the background event
                completionHandler()
            }
        }
        healthStore.execute(query)
    }
    
    private func fetchLatestHeartRateSample(completion: @escaping (HKQuantitySample?) -> Void) {
        let sortDescriptor = NSSortDescriptor(key: HKSampleSortIdentifierStartDate, ascending: false)
        let query = HKSampleQuery(sampleType: heartRateType, predicate: nil, limit: 1, sortDescriptors: [sortDescriptor]) { (query, samples, error) in
            completion(samples?.first as? HKQuantitySample)
        }
        healthStore.execute(query)
    }
    
    private func transmitToBackend(bpm: Double, context: String, timestamp: Date) {
        guard let url = URL(string: "https://api.yourdomain.com/telemetry/heartrate") else { return }
        var request = URLRequest(url: url)
        request.httpMethod = "POST"
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")
        // Add Authorization header with AES-encrypted JWT in a real scenario
        
        let formatter = ISO8601DateFormatter()
        let payload: [String: Any] = [
            "tenant_id": "user_spotify_id", // Fetched from local keychain
            "bpm": bpm,
            "motion_context": context,
            "timestamp": formatter.string(from: timestamp)
        ]
        
        request.httpBody = try? JSONSerialization.data(withJSONObject: payload)
        
        URLSession.shared.dataTask(with: request) { data, response, error in
            if let error = error {
                print("Failed to transmit telemetry: \(error)")
            } else {
                print("Telemetry successfully transmitted.")
            }
        }.resume()
    }
}

# ─── Stage 1: Build ───────────────────────────────────────────────────────────
FROM eclipse-temurin:24-jdk-alpine AS builder

WORKDIR /build

# Cache Maven dependencies trước (tận dụng Docker layer cache)
COPY mvnw mvnw.cmd pom.xml ./
COPY .mvn .mvn

RUN chmod +x mvnw && ./mvnw dependency:go-offline -B

# Build source
COPY src ./src
RUN ./mvnw clean package -DskipTests -B

# ─── Stage 2: Runtime ─────────────────────────────────────────────────────────
FROM eclipse-temurin:24-jre-alpine AS runtime

WORKDIR /app

# Cài curl để healthcheck hoạt động
RUN apk add --no-cache curl

# Tạo thư mục uploads
RUN mkdir -p /app/uploads

# Copy JAR từ build stage
COPY --from=builder /build/target/Capstone2-0.0.1-SNAPSHOT.jar app.jar

# Port Spring Boot
EXPOSE 8080

# Chạy với user non-root (security)
RUN addgroup -S spring && adduser -S spring -G spring
RUN chown -R spring:spring /app
USER spring

ENTRYPOINT ["java", \
  "-Djava.security.egd=file:/dev/./urandom", \
  "-Dspring.devtools.restart.enabled=false", \
  "-jar", "app.jar"]
